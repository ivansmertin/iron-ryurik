import cv2
import requests
import time
from ultralytics import YOLO

# ==========================================
#               НАСТРОЙКИ
# ==========================================

# 1. Ссылка на поток камеры (из настроек Tapo)
# Формат: rtsp://username:password@IP_ADDRESS:554/stream1
RTSP_URL = "rtsp://tapo_user:tapo_password@192.168.0.100:554/stream1"

# 2. Настройки вебхука
WEBHOOK_URL = "http://localhost:3000/api/webhooks/turnstile"
WEBHOOK_SECRET = "dev-secret-key"

# 3. Как часто отправлять данные (в секундах)
# Рекомендуется не чаще раза в 10-20 секунд, чтобы не спамить базу
UPDATE_INTERVAL_SEC = 15

# ==========================================

print("⏳ Загрузка ИИ модели YOLOv8 (может занять время при первом запуске)...")
model = YOLO('yolov8n.pt') 

def send_update(count):
    try:
        payload = {
            "secret": WEBHOOK_SECRET,
            "exactValue": int(count)
        }
        res = requests.post(WEBHOOK_URL, json=payload, timeout=5)
        if res.status_code == 200:
            print(f"✅ Данные отправлены в приложение: {count} чел.")
        else:
            print(f"❌ Ошибка отправки: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"❌ Ошибка соединения сервером: {e}")

def main():
    print(f"📡 Подключение к видеопотоку: {RTSP_URL}")
    cap = cv2.VideoCapture(RTSP_URL)
    
    if not cap.isOpened():
        print("❌ Не удалось подключиться к камере. Проверьте IP, логин и пароль.")
        return

    last_update_time = 0
    last_count = -1

    print("🚀 Аналитика запущена! Нажмите 'q' в окне для выхода.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Потерян сигнал от камеры, переподключение...")
            time.sleep(2)
            # Переподключаемся
            cap = cv2.VideoCapture(RTSP_URL)
            continue

        # Уменьшаем картинку для ускорения работы
        frame_resized = cv2.resize(frame, (640, 360))
        
        # Получаем предсказания только для класса 0 (человек)
        results = model.predict(frame_resized, classes=[0], verbose=False, conf=0.4)
        
        # Считаем количество людей
        person_count = len(results[0].boxes)

        # Рисуем рамочки для наглядности (опционально)
        annotated_frame = results[0].plot()
        cv2.putText(annotated_frame, f"People: {person_count}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imshow("Tapo Tracker", annotated_frame)
        
        current_time = time.time()
        
        # Отправляем на сервер, если:
        # 1. Прошло достаточно времени (UPDATE_INTERVAL_SEC)
        # 2. ИЛИ количество людей изменилось
        if current_time - last_update_time > UPDATE_INTERVAL_SEC:
            if person_count != last_count:
                send_update(person_count)
                last_count = person_count
            last_update_time = current_time

        # Выход по кнопке 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
