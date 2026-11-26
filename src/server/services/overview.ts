import "server-only";
import { getDataSource } from "@/server/sql/schema";

export type DataSourceColumn = { name: string; type: string; comment: string | null; isKey: boolean };

export type DataSourceSummary = {
  tables: {
    name: string;
    rowCount: number;
    columnCount: number;
    isUpload: boolean;
    comment: string | null;
    /** The same columns, types and business-rule notes the agent reads (no sample values). */
    columns: DataSourceColumn[];
  }[];
};

/** Tables the user can ask about, with their columns, for the Data page and the "what can I ask" chips. */
export async function getDataSourceSummary(userId: string): Promise<DataSourceSummary> {
  const { tables } = await getDataSource(userId);
  return {
    tables: tables.map((table) => ({
      name: table.schema === "analytics" ? table.name : `${table.schema}.${table.name}`,
      rowCount: table.rowCount,
      columnCount: table.columns.length,
      isUpload: table.schema !== "analytics",
      comment: table.comment,
      columns: table.columns.map((column) => ({
        name: column.name,
        type: column.dataType,
        comment: column.comment,
        isKey: column.isPrimaryKey || column.references !== null,
      })),
    })),
  };
}
