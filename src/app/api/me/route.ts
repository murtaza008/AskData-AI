import type { AccountDTO } from "@/lib/account";
import { env } from "@/server/env";
import { requireUser, route } from "@/server/http";
import { countRecentQuestions } from "@/server/services/conversations";

/** The signed-in account and its question usage (the demo account has a daily quota). */
export const GET = route(async () => {
  const user = await requireUser();
  const body: AccountDTO = {
    name: user.name,
    email: user.email,
    isDemo: user.isDemo,
    usage: {
      questionsLast24h: await countRecentQuestions(user.id),
      dailyLimit: user.isDemo ? env.demoDailyQuestions : null,
    },
  };
  return Response.json(body);
});
