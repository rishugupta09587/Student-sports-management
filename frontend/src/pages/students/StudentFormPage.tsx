import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { studentFormSchema, type StudentFormSchema } from '@/lib/validation/student.schema';
import { useCreateStudent, useStudent, useUpdateStudent } from '@/hooks/use-students';
import { BLOOD_GROUPS, GENDERS } from '@/types/student';
import { initials } from '@/lib/format';

export default function StudentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: existing, isLoading: loadingExisting } = useStudent(id);
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent(id ?? '');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormSchema>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      usn: '',
      phone: '',
      dob: '',
      gender: '',
      semester: '',
      branch: '',
      email: '',
      motherName: '',
      fatherName: '',
      sport: '',
      bloodGroup: '',
    },
  });

  React.useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        usn: existing.usn,
        phone: existing.phone,
        dob: existing.dob ?? '',
        gender: existing.gender ?? '',
        semester: existing.semester ?? '',
        branch: existing.branch ?? '',
        email: existing.email ?? '',
        motherName: existing.motherName ?? '',
        fatherName: existing.fatherName ?? '',
        sport: existing.sport ?? '',
        bloodGroup: existing.bloodGroup ?? '',
      });
    }
  }, [existing, reset]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) setPhotoPreview(URL.createObjectURL(file));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: StudentFormSchema) {
    const payload = { ...values, photo: photoFile };
    if (isEdit && id) {
      await updateMutation.mutateAsync(payload);
      navigate(`/students/${id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/students/${created._id}`);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const currentName = watch('name');

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Back
      </Button>
      <PageHeader title={isEdit ? 'Edit Student' : 'Add Student'} description="Fields marked * are required" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={photoPreview ?? existing?.photoUrl} alt="Preview" />
                <AvatarFallback className="text-lg">{currentName ? initials(currentName) : '?'}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="photo" className="mb-2 cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Camera />
                      {photoFile || existing?.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </Button>
                </Label>
                <input id="photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <p className="text-muted-foreground mt-1 text-xs">JPEG, PNG, WEBP or GIF, up to 5MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register('name')} aria-invalid={Boolean(errors.name)} />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usn">USN (10 characters) *</Label>
                <Input id="usn" maxLength={10} {...register('usn')} aria-invalid={Boolean(errors.usn)} />
                {errors.usn && <p className="text-destructive text-xs">{errors.usn.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number (10 digits) *</Label>
                <Input id="phone" maxLength={10} {...register('phone')} aria-invalid={Boolean(errors.phone)} />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} aria-invalid={Boolean(errors.email)} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" {...register('dob')} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={watch('gender') || undefined} onValueChange={(v) => setValue('gender', v as StudentFormSchema['gender'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" {...register('branch')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" {...register('semester')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sport">Sport</Label>
                <Input id="sport" placeholder="e.g. Football, Basketball" {...register('sport')} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select
                  value={watch('bloodGroup') || undefined}
                  onValueChange={(v) => setValue('bloodGroup', v as StudentFormSchema['bloodGroup'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input id="fatherName" {...register('fatherName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input id="motherName" {...register('motherName')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Save Student'}
          </Button>
        </div>
      </form>
    </div>
  );
}
