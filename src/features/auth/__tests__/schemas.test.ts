import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("validates correct login data", () => {
      const data = { email: "test@example.com", password: "password123" };
      expect(loginSchema.safeParse(data).success).toBe(true);
    });

    it("errors on invalid email", () => {
      const data = { email: "invalid-email", password: "password123" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Введите корректный email");
      }
    });

    it("errors on empty password", () => {
      const data = { email: "test@example.com", password: "" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Введите пароль");
      }
    });
  });

  describe("registerSchema", () => {
    it("validates correct registration data", () => {
      const data = {
        fullName: "Иван Иванов",
        email: "ivan@example.com",
        password: "password123",
        passwordConfirm: "password123",
        sport: "running",
        acceptRules: true,
      };
      expect(registerSchema.safeParse(data).success).toBe(true);
    });

    it("errors if passwords do not match", () => {
      const data = {
        fullName: "Иван Иванов",
        email: "ivan@example.com",
        password: "password123",
        passwordConfirm: "different",
        acceptRules: true,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.find(i => i.path.includes("passwordConfirm"))?.message).toBe("Пароли не совпадают");
      }
    });

    it("errors if custom rules are not accepted", () => {
      const data = {
        fullName: "Иван Иванов",
        email: "ivan@example.com",
        password: "password123",
        passwordConfirm: "password123",
        acceptRules: false,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Необходимо согласиться с правилами");
      }
    });

    it("errors on short password", () => {
      const data = {
        fullName: "Иван Иванов",
        email: "ivan@example.com",
        password: "short",
        passwordConfirm: "short",
        acceptRules: true,
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Минимум 8 символов");
      }
    });
  });

  describe("forgotPasswordSchema", () => {
    it("validates valid email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "test@example.com" }).success).toBe(true);
    });
  });

  describe("resetPasswordSchema", () => {
    it("validates matching passwords", () => {
      const data = { password: "newpassword123", passwordConfirm: "newpassword123" };
      expect(resetPasswordSchema.safeParse(data).success).toBe(true);
    });

    it("errors on mismatch", () => {
      const data = { password: "newpassword123", passwordConfirm: "mismatch" };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
