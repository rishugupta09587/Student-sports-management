import { Document, Packer, PageBreak, Paragraph, TextRun } from 'docx';
import { IStudent } from '../../models/Student.model';

const BODY_SIZE = 28; // 14pt in half-points

function blank(count: number): Paragraph[] {
  return Array.from({ length: count }, () => new Paragraph({ text: '' }));
}

export async function buildHodBonafideDocx(students: IStudent[], academicYear = '20__-20__'): Promise<Buffer> {
  const children: Paragraph[] = [];

  students.forEach((s, index) => {
    children.push(...blank(4));

    const content =
      `This is to certify that Mr/Ms ${s.name || '____________________________'} is a student of ` +
      `${s.branch || '___________________________'} department studying in _____________ Semester Bearing USN ` +
      `${s.usn || '_____________________________'} for academic year \n${academicYear}.And his/her present ` +
      `attendance is _________% he/she can/can't take part in sports activity on __/__/____ to__/__/____.`;

    children.push(new Paragraph({ children: [new TextRun({ text: content, size: BODY_SIZE })] }));
    children.push(...blank(5));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Physical Education Director            Head of the Department', size: BODY_SIZE })],
      })
    );

    if (index < students.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
