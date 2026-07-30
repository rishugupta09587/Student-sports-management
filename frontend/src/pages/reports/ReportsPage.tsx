import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, FileText, History, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { useStudents } from '@/hooks/use-students';
import { useGenerateAllReport, useGenerateCustomReport, useGenerateReport } from '@/hooks/use-reports';
import { REPORT_FORMAT_LABELS, REPORT_FORMATS, type ReportFormat } from '@/types/report';

const PLACEHOLDER_TOKENS = ['[NAME]', '[USN]', '[BRANCH]', '[SEMESTER]', '[PHONE]', '[EMAIL]', '[SPORT]', '[DOB]', '[GENDER]', '[MOTHER_NAME]', '[FATHER_NAME]', '[BLOOD_GROUP]'];

const DEFAULT_CUSTOM_CONTENT = `This is to certify that Mr/Ms [NAME] is a student of [BRANCH] department studying in _____________ Semester Bearing USN [USN] for academic year 20__-20__. And his/her present attendance is _________% he/she can/can't take part in sports activity on __/__/____ to __/__/____.


Physical Education Director            Head of the Department`;

export default function ReportsPage() {
  const location = useLocation();
  const preselected = (location.state as { studentIds?: string[] } | null)?.studentIds ?? [];

  const [selected, setSelected] = React.useState<Set<string>>(new Set(preselected));
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [format, setFormat] = React.useState<ReportFormat>('vtu_eligibility');
  const [allFormat, setAllFormat] = React.useState<ReportFormat>('vtu_eligibility');
  const [customTitle, setCustomTitle] = React.useState('Bonafide Certificate');
  const [customContent, setCustomContent] = React.useState(DEFAULT_CUSTOM_CONTENT);

  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useStudents({ search: debouncedSearch || undefined, page, limit: 8, sortBy: 'name', sortOrder: 'asc' });

  const generateReport = useGenerateReport();
  const generateAllReport = useGenerateAllReport();
  const generateCustomReport = useGenerateCustomReport();

  const students = data?.students ?? [];
  const allSelected = students.length > 0 && students.every((s) => selected.has(s._id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) students.forEach((s) => next.delete(s._id));
      else students.forEach((s) => next.add(s._id));
      return next;
    });
  }

  function handleGenerate() {
    const ids = Array.from(selected);
    if (format === 'custom') {
      generateCustomReport.mutate({ studentIds: ids, title: customTitle, content: customContent });
    } else {
      generateReport.mutate({ studentIds: ids, format });
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate VTU eligibility proformas and bonafide certificates"
        actions={
          <Button variant="outline" asChild>
            <Link to="/reports/history">
              <History />
              Report History
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="select">
        <TabsList>
          <TabsTrigger value="select">Select Students</TabsTrigger>
          <TabsTrigger value="all">All Students</TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Choose Students</CardTitle>
                <CardDescription>{selected.size} selected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input placeholder="Search students..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {!isLoading && students.length === 0 ? (
                  <EmptyState icon={Users} title="No students found" description="Add students first to generate reports." />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>USN</TableHead>
                          <TableHead>Sport</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student._id} className="cursor-pointer" onClick={() => toggleOne(student._id)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={selected.has(student._id)} onCheckedChange={() => toggleOne(student._id)} />
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="font-mono text-xs">{student.usn}</TableCell>
                            <TableCell>{student.sport || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {data?.meta && (
                  <div className="mt-3">
                    <Pagination meta={data.meta} onPageChange={setPage} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {REPORT_FORMATS.map((f) => (
                    <label
                      key={f}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="accent-primary"
                      />
                      {REPORT_FORMAT_LABELS[f]}
                    </label>
                  ))}
                </div>

                {format === 'custom' && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Report Title</Label>
                      <Input id="title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="content">Content</Label>
                      <Textarea id="content" rows={8} value={customContent} onChange={(e) => setCustomContent(e.target.value)} />
                      <p className="text-muted-foreground text-xs">
                        Placeholders: {PLACEHOLDER_TOKENS.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={selected.size === 0 || generateReport.isPending || generateCustomReport.isPending}
                  onClick={handleGenerate}
                >
                  <FileText />
                  Generate & Download
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Generate Report for All Students</CardTitle>
              <CardDescription>Creates one document containing every student currently on record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {REPORT_FORMATS.filter((f) => f !== 'custom').map((f) => (
                  <label
                    key={f}
                    className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="radio"
                      name="all-format"
                      value={f}
                      checked={allFormat === f}
                      onChange={() => setAllFormat(f)}
                      className="accent-primary"
                    />
                    {REPORT_FORMAT_LABELS[f]}
                  </label>
                ))}
              </div>
              <Button className="w-full" disabled={generateAllReport.isPending} onClick={() => generateAllReport.mutate(allFormat)}>
                <Download />
                Generate for All Students
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
