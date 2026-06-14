/** Shared title fragments for admin empty states (matches member-facing stroke pattern). */
export function AdminEmptyTitle({ noun }: { noun: string }) {
  return (
    <>
      No {noun} <span className="text-stroke">yet.</span>
    </>
  );
}

export function AdminEmptyTitleAllClear({ phrase }: { phrase: string }) {
  return <>{phrase}</>;
}
