/** The user's question, right-aligned like a sent message. */
export function UserQuestion({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-md border bg-card px-4 py-2.5 text-[15px]">
        {text}
      </p>
    </div>
  );
}
