import { redirect } from 'next/navigation';

// The public listing lives at /shared (Phase 2). Root path is not itself a
// page -- see design.md's Folder Structure.
export default function RootPage() {
  redirect('/shared');
}
