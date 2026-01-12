/**
 * CHUTEA 智慧中台 - 身份认证服务 (AuthService)
 *
 * 功能：
 * 1. 无感注册登录（手机号不存在自动创建，存在直接登录）
 * 2. JWT Token 生成与校验
 * 3. 用户状态管理
 *
 * 安全逻辑：
 * - 必须先通过 SMS 验证码校验
 * - JWT Token 包含过期时间
 * - 支持 Token 刷新
 */

import jwt from "jsonwebtoken";
import { getDb } from "../../db";
import { getSmsVerificationService } from "./sms-verification-service";
import { getTelegramBotService } from "./telegram-bot-service";

// ==================== 类型定义 ====================

/** 用户状态 */
export type UserStatus = "ACTIVE" | "DISABLED" | "DELETED";

/** 用户信息 */
export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 登录请求 */
export interface LoginRequest {
  phone: string;
  code: string;
  userIp?: string;
}

/** 登录响应 */
export interface LoginResponse {
  success: boolean;
  isNewUser?: boolean;
  user?: {
    id: number;
    phone: string;
    nickname: string | null;
    avatar: string | null;
  };
  token?: string;
  expiresAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

/** JWT Payload */
export interface JwtPayload {
  userId: number;
  phone: string;
  iat: number;
  exp: number;
}

// ==================== 常量配置 ====================

/** JWT 密钥（从环境变量读取） */
const JWT_SECRET = process.env.JWT_SECRET || "chutea-jwt-secret-2024";

/** JWT 过期时间（7 天） */
const JWT_EXPIRES_IN = "7d";

/** JWT 过期时间（秒） */
const JWT_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

// ==================== 核心服务类 ====================

export class AuthService {
  private static instance: AuthService;
  private smsVerificationService = getSmsVerificationService();

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 🔥 无感注册登录
   *
   * 流程：
   * 1. 校验 SMS 验证码
   * 2. 查找用户（按手机号）
   * 3. 如果不存在 -> 自动创建用户
   * 4. 如果存在 -> 更新登录信息
   * 5. 生成 JWT Token
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { phone, code, userIp } = request;
    const language = "ru"; // 默认俄语

    console.log("\n" + "=".repeat(70));
    console.log("[AuthService] 🔐 LOGIN / REGISTER");
    console.log("=".repeat(70));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Phone: ${phone.substring(0, 5)}***`);
    console.log(`IP: ${userIp || "unknown"}`);

    // ==================== 第一步：校验 SMS 验证码 ====================
    console.log("\n[Step 1] 校验 SMS 验证码...");

    const verifyResult = await this.smsVerificationService.verifyCode({
      phone,
      code,
      purpose: "LOGIN",
      userIp,
    });

    if (!verifyResult.success) {
      console.log(`❌ 验证码校验失败: ${verifyResult.errorCode}`);
      return {
        success: false,
        errorCode: verifyResult.errorCode,
        errorMessage: verifyResult.errorMessage,
      };
    }

    console.log("✅ 验证码校验通过");

    // ==================== 第二步：查找或创建用户 ====================
    console.log("\n[Step 2] 查找或创建用户...");

    const db = await getDb();
    if (!db) {
      console.log("❌ 数据库不可用");
      return {
        success: false,
        errorCode: "DATABASE_ERROR",
        errorMessage: language === "ru" ? "Ошибка базы данных." : "数据库错误",
      };
    }

    try {
      // 查找用户
      const [existingUsers] = await (db as any).execute(
        "SELECT * FROM users WHERE phone = ? AND status = ?",
        [phone, "ACTIVE"]
      );

      let user: User;
      let isNewUser = false;

      if (existingUsers && existingUsers.length > 0) {
        // ==================== 用户已存在 -> 直接登录 ====================
        console.log("✅ 用户已存在，执行登录");
        user = this.mapRowToUser(existingUsers[0]);

        // 更新登录信息
        await (db as any).execute(
          `UPDATE users SET 
             last_login_at = NOW(), 
             last_login_ip = ?, 
             login_count = login_count + 1 
           WHERE id = ?`,
          [userIp || null, user.id]
        );

        console.log(`   用户 ID: ${user.id}`);
        console.log(`   登录次数: ${user.loginCount + 1}`);
      } else {
        // ==================== 用户不存在 -> 自动创建 ====================
        console.log("✅ 用户不存在，自动创建新用户");
        isNewUser = true;

        // 生成默认昵称
        const defaultNickname = this.generateDefaultNickname(phone);

        const [insertResult] = await (db as any).execute(
          `INSERT INTO users (phone, nickname, last_login_at, last_login_ip, login_count)
           VALUES (?, ?, NOW(), ?, 1)`,
          [phone, defaultNickname, userIp || null]
        );

        const userId = insertResult.insertId;
        console.log(`   新用户 ID: ${userId}`);
        console.log(`   默认昵称: ${defaultNickname}`);

        // 查询新创建的用户
        const [newUsers] = await (db as any).execute(
          "SELECT * FROM users WHERE id = ?",
          [userId]
        );

        user = this.mapRowToUser(newUsers[0]);
      }

      // ==================== 第三步：生成 JWT Token ====================
      console.log("\n[Step 3] 生成 JWT Token...");

      const token = this.generateToken(user);
      const expiresAt = new Date(Date.now() + JWT_EXPIRES_SECONDS * 1000);

      console.log(`✅ Token 已生成，有效期至 ${expiresAt.toISOString()}`);
      console.log("=".repeat(70) + "\n");

      // ==================== 第四步：发送 Telegram 通知 ====================
      if (isNewUser) {
        console.log("\n[Step 4] 发送新用户注册 Telegram 通知...");

        // 异步发送，不阻塞登录流程
        this.sendRegistrationNotification(user, userIp).catch((err: Error) => {
          console.error("[AuthService] Telegram 通知发送失败:", err);
        });

        console.log("✅ Telegram 通知已触发（异步）");
      }

      return {
        success: true,
        isNewUser,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
        },
        token,
        expiresAt,
      };
    } catch (error) {
      console.error("[AuthService] 登录异常:", error);
      return {
        success: false,
        errorCode: "LOGIN_ERROR",
        errorMessage:
          language === "ru"
            ? "Ошибка входа. Попробуйте позже."
            : "登录失败，请稍后重试",
      };
    }
  }

  /**
   * 生成 JWT Token
   */
  generateToken(user: User): string {
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      userId: user.id,
      phone: user.phone,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * 校验 JWT Token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error("[AuthService] Token 校验失败:", error);
      return null;
    }
  }

  /**
   * 刷新 JWT Token
   */
  async refreshToken(
    token: string
  ): Promise<{ token: string; expiresAt: Date } | null> {
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    // 查找用户
    const db = await getDb();
    if (!db) return null;

    try {
      const [users] = await (db as any).execute(
        "SELECT * FROM users WHERE id = ? AND status = ?",
        [payload.userId, "ACTIVE"]
      );

      if (!users || users.length === 0) {
        return null;
      }

      const user = this.mapRowToUser(users[0]);
      const newToken = this.generateToken(user);
      const expiresAt = new Date(Date.now() + JWT_EXPIRES_SECONDS * 1000);

      return { token: newToken, expiresAt };
    } catch (error) {
      console.error("[AuthService] 刷新 Token 失败:", error);
      return null;
    }
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(userId: number): Promise<User | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const [users] = await (db as any).execute(
        "SELECT * FROM users WHERE id = ? AND status = ?",
        [userId, "ACTIVE"]
      );

      if (!users || users.length === 0) {
        return null;
      }

      return this.mapRowToUser(users[0]);
    } catch (error) {
      console.error("[AuthService] 获取用户失败:", error);
      return null;
    }
  }

  /**
   * 根据手机号获取用户
   */
  async getUserByPhone(phone: string): Promise<User | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const [users] = await (db as any).execute(
        "SELECT * FROM users WHERE phone = ? AND status = ?",
        [phone, "ACTIVE"]
      );

      if (!users || users.length === 0) {
        return null;
      }

      return this.mapRowToUser(users[0]);
    } catch (error) {
      console.error("[AuthService] 获取用户失败:", error);
      return null;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(
    userId: number,
    updates: { nickname?: string; avatar?: string }
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.nickname !== undefined) {
        fields.push("nickname = ?");
        values.push(updates.nickname);
      }

      if (updates.avatar !== undefined) {
        fields.push("avatar = ?");
        values.push(updates.avatar);
      }

      if (fields.length === 0) {
        return true;
      }

      values.push(userId);

      await (db as any).execute(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error("[AuthService] 更新用户失败:", error);
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 发送新用户注册 Telegram 通知
   */
  private async sendRegistrationNotification(
    user: User,
    userIp?: string
  ): Promise<void> {
    const telegramService = getTelegramBotService();

    await telegramService.sendNotification({
      type: "USER_REGISTERED",
      data: {
        phone: user.phone,
        userType: "CLIENT",
        region: "Россия",
        ipAddress: userIp || "Не определён",
        nickname: user.nickname,
        userId: user.id,
      },
      userId: user.id,
    });
  }

  /**
   * 生成默认昵称
   */
  private generateDefaultNickname(phone: string): string {
    // 取手机号后 4 位
    const suffix = phone.slice(-4);
    return `Гость${suffix}`; // 俄语"访客" + 手机号后4位
  }

  /**
   * 将数据库行映射为 User 对象
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      phone: row.phone,
      nickname: row.nickname,
      avatar: row.avatar,
      status: row.status,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      lastLoginIp: row.last_login_ip,
      loginCount: row.login_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ==================== 导出 ====================

export function getAuthService(): AuthService {
  return AuthService.getInstance();
}

export default AuthService;
