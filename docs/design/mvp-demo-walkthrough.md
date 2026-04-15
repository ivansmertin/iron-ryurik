# MVP Demo Walkthrough

## Что обновлено визуально
- Освежены theme tokens и контраст в `src/app/globals.css`.
- Полирован глобальный shell: sidebar, top header, user menu.
- Унифицированы high-impact компоненты: button/input/textarea/table/page-header/tab-links.
- Подтянуты ключевые demo-экраны по ролям: auth, client, trainer, admin.

## Маршрут демо для заказчика

### 1) Auth
1. `/login`
2. `/register`

Показываем: аккуратную форму, единый стиль полей и действий, читаемость и иерархию.

### 2) Client
1. `/client/schedule`
2. `/client/bookings`
3. `/client/diary`

Показываем: карточный стиль, табы, плотность контента, понятные CTA.

### 3) Trainer
1. `/trainer/clients`
2. `/trainer/clients/[id]`
3. `/trainer/slots`

Показываем: таблицы/карточки и связность экосистемы тренера.

### 4) Admin
1. `/admin/schedule`
2. `/admin/clients`
3. `/admin/memberships/plans`
4. `/admin/exercises`

Показываем: плотные операционные экраны в едином визуальном стиле.

## Что важно озвучить заказчику
- Это осознанный `balanced refresh` для MVP-показа, без изменения бизнес-логики.
- Визуальный слой подготовлен к быстрой замене под будущие дизайнерские макеты.
