import * as React from 'react';
import { Download, FileUp, Search, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { useDeleteTemplate, useGenerateFromTemplate, useTemplates, useUploadTemplate } from '@/hooks/use-templates';
import { useStudents } from '@/hooks/use-students';
import type { Template } from '@/types/template';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useTemplates();
  const uploadMutation = useUploadTemplate();
  const deleteMutation = useDeleteTemplate();
  const generateMutation = useGenerateFromTemplate();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadName, setUploadName] = React.useState('');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Template | null>(null);
  const [generateTarget, setGenerateTarget] = React.useState<Template | null>(null);
  const [studentSearch, setStudentSearch] = React.useState('');
  const [studentId, setStudentId] = React.useState<string | null>(null);

  const debouncedSearch = useDebounce(studentSearch, 300);
  const { data: studentResults } = useStudents({ search: debouncedSearch || undefined, limit: 6, sortBy: 'name', sortOrder: 'asc' });

  async function handleUpload() {
    if (!uploadFile || !uploadName.trim()) return;
    await uploadMutation.mutateAsync({ name: uploadName.trim(), file: uploadFile });
    setUploadOpen(false);
    setUploadName('');
    setUploadFile(null);
  }

  function handleGenerate() {
    if (!generateTarget || !studentId) return;
    generateMutation.mutate(
      { templateId: generateTarget._id, studentId, fileName: `${generateTarget.name.replace(/\s+/g, '_')}.docx` },
      { onSuccess: () => setGenerateTarget(null) }
    );
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Upload reusable DOCX templates with variable placeholders like {NAME}, {USN}, {BRANCH}"
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload />
            Upload Template
          </Button>
        }
      />

      {isError && <ErrorState message="Could not load templates." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      )}

      {!isLoading && templates?.length === 0 && (
        <EmptyState
          icon={FileUp}
          title="No templates uploaded"
          description="Upload a .docx file with placeholders like {NAME} or {USN} to auto-fill student data."
          action={<Button onClick={() => setUploadOpen(true)}>Upload Template</Button>}
        />
      )}

      {templates && templates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template._id}>
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <p className="text-muted-foreground truncate text-xs">{template.originalFilename}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-xs">{formatBytes(template.sizeBytes)}</p>
                <div className="flex flex-wrap gap-1">
                  {template.placeholders.length === 0 ? (
                    <span className="text-muted-foreground text-xs">No placeholders detected</span>
                  ) : (
                    template.placeholders.map((p) => (
                      <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                        {`{${p}}`}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" className="flex-1" onClick={() => setGenerateTarget(template)}>
                  <Download />
                  Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(template)}>
                  <Trash2 />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>
              Use placeholders like {'{NAME}'}, {'{USN}'}, {'{BRANCH}'}, {'{SPORT}'} anywhere in the document; they'll be
              replaced with student data when generating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Template Name</Label>
              <Input id="template-name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g. Sports Leave Letter" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-file">DOCX File</Label>
              <Input id="template-file" type="file" accept=".docx" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadName.trim() || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(generateTarget)} onOpenChange={(open) => !open && setGenerateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate from "{generateTarget?.name}"</DialogTitle>
            <DialogDescription>Select a student to fill this template with.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="pl-9" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {(studentResults?.students ?? []).map((s) => (
              <button
                key={s._id}
                onClick={() => setStudentId(s._id)}
                className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
                  studentId === s._id ? 'border-primary bg-accent' : 'hover:bg-accent'
                }`}
              >
                <span className="font-medium">{s.name}</span>{' '}
                <span className="text-muted-foreground font-mono text-xs">{s.usn}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={!studentId || generateMutation.isPending}>
              {generateMutation.isPending ? 'Generating...' : 'Generate & Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This template will be permanently removed."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
