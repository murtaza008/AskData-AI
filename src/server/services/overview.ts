import "server-only";
import { getDataSource } from "@/server/sql/schema";

export type DataSourceSummary = {
  tables: { name: string; rowCount: number; columnCount: number; isUpload: boolean }[];
};

/** Table names and sizes for the "what can I ask about" chip in the chat. */
export async function getDataSourceSummary(userId: string): Promise<DataSourceSummary> {
  const { tables } = await getDataSource(userId);
  return {
    tables: tables.map((table) => ({
      name: table.schema === "analytics" ? table.name : `${table.schema}.${table.name}`,
      rowCount: table.rowCount,
      columnCount: table.columns.length,
      isUpload: table.schema !== "analytics",
    })),
  };
}
