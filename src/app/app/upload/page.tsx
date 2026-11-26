import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/page-frame";
import { UploadView } from "@/features/upload/components/upload-view";

export const metadata: Metadata = { title: "Upload data" };

export default function UploadPage() {
  return (
    <PageFrame>
      <UploadView />
    </PageFrame>
  );
}
