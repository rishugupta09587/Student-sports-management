import { Document, Packer, PageBreak, Paragraph } from 'docx';
import { IStudent } from '../../models/Student.model';

export function applyPlaceholders(content: string, student: IStudent): string {
  return content
    .replaceAll('[NAME]', student.name ?? '')
    .replaceAll('[USN]', student.usn ?? '')
    .replaceAll('[BRANCH]', student.branch ?? '')
    .replaceAll('[SEMESTER]', student.semester ?? '')
    .replaceAll('[PHONE]', student.phone ?? '')
    .replaceAll('[EMAIL]', student.email ?? '')
    .replaceAll('[SPORT]', student.sport ?? '')
    .replaceAll('[DOB]', student.dob ?? '')
    .replaceAll('[GENDER]', student.gender ?? '')
    .replaceAll('[MOTHER_NAME]', student.motherName ?? '')
    .replaceAll('[FATHER_NAME]', student.fatherName ?? '')
    .replaceAll('[BLOOD_GROUP]', student.bloodGroup ?? '');
}

export async function buildCustomReportDocx(students: IStudent[], content: string): Promise<Buffer> {
  const children: (Paragraph)[] = [];

  students.forEach((student, index) => {
    const rendered = applyPlaceholders(content, student);
    rendered.split('\n').forEach((line) => children.push(new Paragraph({ text: line })));

    if (index < students.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({ sections: [{ children: children.length ? children : [new Paragraph({ text: '' })] }] });
  return Packer.toBuffer(doc);
}
