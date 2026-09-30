import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ReportQueue, type ProblemReport } from './ReportQueue';

export const metadata: Metadata = { title: 'Problem Reports' };

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('problem_reports')
    .select('id, category, details, contact_email, page_path, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Unable to load problem reports: ${error.message}`);

  const reports = (data ?? []).map((report) => ({
    ...report,
    category: report.category as ProblemReport['category'],
    status: report.status as ProblemReport['status'],
  })) satisfies ProblemReport[];
  return <ReportQueue initialReports={reports} />;
}
