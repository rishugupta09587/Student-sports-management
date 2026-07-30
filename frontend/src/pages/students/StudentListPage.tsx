import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { useDeleteStudent, useExportStudents, useImportStudents, useStudents } from '@/hooks/use-students';
import { BLOOD_GROUPS, GENDERS, type Student, type StudentListParams } from '@/types/student';
import { initials } from '@/lib/format';

const SORT_OPTIONS: { value: StudentListParams['sortBy']; label: string }[] = [
  { value: 'createdAt', label: 'Recently added' },
  { value: 'name', label: 'Name' },
  { value: 'usn', label: 'USN' },
  { value: 'branch', label: 'Branch' },
  { value: 'sport', label: 'Sport' },
];

export default function StudentListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [gender, setGender] = React.useState<string>('all');
  const [bloodGroup, setBloodGroup] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<StudentListParams['sortBy']>('createdAt');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<Student | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const params: StudentListParams = {
    search: debouncedSearch || undefined,
    gender: gender === 'all' ? undefined : (gender as StudentListParams['gender']),
    bloodGroup: bloodGroup === 'all' ? undefined : (bloodGroup as StudentListParams['bloodGroup']),
    sortBy,
    sortOrder: 'desc',
    page,
    limit: 10,
  };

  const { data, isLoading, isError, refetch, isFetching } = useStudents(params);
  const deleteMutation = useDeleteStudent();
  const exportMutation = useExportStudents();
  const importMutation = useImportStudents();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gender, bloodGroup, sortBy]);

  const students = data?.students ?? [];
  const allSelected = students.length > 0 && students.every((s) => selected.has(s._id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        students.forEach((s) => next.delete(s._id));
      } else {
        students.forEach((s) => next.add(s._id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleGenerateReport() {
    navigate('/reports', { state: { studentIds: Array.from(selected) } });
  }

  async function handleImport() {
    if (!importFile) return;
    await importMutation.mutateAsync(importFile);
    setImportOpen(false);
    setImportFile(null);
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student sports records"
        actions={
          <>
            <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              <Download />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              Import CSV
            </Button>
            <Button asChild>
              <Link to="/students/new">
                <UserPlus />
                Add Student
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, USN, branch, sport..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bloodGroup} onValueChange={setBloodGroup}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Blood group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All blood groups</SelectItem>
            {BLOOD_GROUPS.map((bg) => (
              <SelectItem key={bg} value={bg}>
                {bg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as StudentListParams['sortBy'])}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value!}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="bg-accent mb-4 flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
          <span>{selected.size} student(s) selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleGenerateReport}>
              <FileText />
              Generate Report
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X />
              Clear
            </Button>
          </div>
        </div>
      )}

      {isError && <ErrorState message="Could not load students." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isError && students.length === 0 && (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Try adjusting your filters, or add a new student to get started."
          action={
            <Button asChild>
              <Link to="/students/new">Add Student</Link>
            </Button>
          }
        />
      )}

      {!isLoading && students.length > 0 && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(student._id)}
                        onCheckedChange={() => toggleOne(student._id)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link to={`/students/${student._id}`} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={student.photoUrl} alt={student.name} />
                          <AvatarFallback>{initials(student.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium hover:underline">{student.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{student.usn}</TableCell>
                    <TableCell>{student.branch || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{student.sport ? <Badge variant="secondary">{student.sport}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/students/${student._id}`)}>
                            <Eye />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/students/${student._id}/edit`)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(student)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data?.meta && (
            <div className="mt-4">
              <Pagination meta={data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This will permanently remove the student record and photo. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import students from CSV</DialogTitle>
            <DialogDescription>
              CSV must include columns: name, usn, phone (required), dob, gender, semester, branch, email, motherName,
              fatherName, sport, bloodGroup (optional).
            </DialogDescription>
          </DialogHeader>
          <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
