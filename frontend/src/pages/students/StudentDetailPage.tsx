import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDeleteStudent, useStudent } from '@/hooks/use-students';
import { formatDate, initials } from '@/lib/format';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: student, isLoading, isError, refetch } = useStudent(id);
  const deleteMutation = useDeleteStudent();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !student) {
    return <ErrorState title="Student not found" message="This student may have been deleted." onRetry={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/students')}>
        <ArrowLeft />
        Back to Students
      </Button>

      <PageHeader
        title={student.name}
        description={student.usn}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/reports', { state: { studentIds: [student._id] } })}>
              <FileText />
              Generate Report
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/students/${student._id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center text-center">
            <Avatar className="size-28">
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback className="text-2xl">{initials(student.name)}</AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold">{student.name}</h2>
            <p className="text-muted-foreground text-sm">{student.branch || 'No branch set'}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {student.sport && <Badge>{student.sport}</Badge>}
              {student.gender && <Badge variant="secondary">{student.gender}</Badge>}
              {student.bloodGroup && <Badge variant="outline">{student.bloodGroup}</Badge>}
            </div>
            <Separator className="my-4" />
            <div className="w-full space-y-2 text-left text-sm">
              <div className="flex items-center gap-2">
                <Phone className="text-muted-foreground size-4" />
                <span>{student.phone}</span>
              </div>
              {student.email && (
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground size-4" />
                  <span className="break-all">{student.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground size-4" />
                <span>Added {formatDate(student.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Details</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="USN" value={student.usn} />
              <InfoRow label="Branch" value={student.branch} />
              <InfoRow label="Semester" value={student.semester} />
              <InfoRow label="Date of Birth" value={student.dob} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Family & Contact</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Father's Name" value={student.fatherName} />
              <InfoRow label="Mother's Name" value={student.motherName} />
              <InfoRow label="Phone" value={student.phone} />
              <InfoRow label="Email" value={student.email} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="border-muted relative ml-2 space-y-4 border-l pl-4">
                <li>
                  <div className="bg-primary absolute -left-[5px] size-2.5 rounded-full" />
                  <p className="text-sm font-medium">Record created</p>
                  <p className="text-muted-foreground text-xs">{formatDate(student.createdAt)}</p>
                </li>
                {student.updatedAt !== student.createdAt && (
                  <li>
                    <div className="bg-primary absolute -left-[5px] size-2.5 rounded-full" />
                    <p className="text-sm font-medium">Last updated</p>
                    <p className="text-muted-foreground text-xs">{formatDate(student.updatedAt)}</p>
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${student.name}?`}
        description="This will permanently remove the student record and photo. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(student._id, { onSuccess: () => navigate('/students') })}
      />
    </div>
  );
}
