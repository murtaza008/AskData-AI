/** Response of GET /api/me: who is signed in and how much of the demo quota is used. */
export type AccountDTO = {
  name: string;
  email: string;
  isDemo: boolean;
  usage: {
    /** Questions answered in the last 24 hours. */
    questionsLast24h: number;
    /** Daily question limit; null when the account has none (only the shared demo is limited). */
    dailyLimit: number | null;
  };
};
