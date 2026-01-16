/**
 * CHUTEA tRPC Router - Auth
 *
 * tRPC authentication procedures
 * - logout: Clear session cookie and return success
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../../_core/trpc";
import { COOKIE_NAME } from "../../../../shared/const";

/**
 * Auth Router
 */
export const authRouter = router({
  /**
   * Logout - Clear session cookie
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear the session cookie
    if (ctx.res && typeof ctx.res.clearCookie === "function") {
      ctx.res.clearCookie(COOKIE_NAME, {
        maxAge: -1,
        secure: ctx.req?.protocol === "https",
        sameSite: "none",
        httpOnly: true,
        path: "/",
      });
    }

    return { success: true };
  }),
});
