import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { IStudent } from '../../models/Student.model';

const SUB_SIZE = 22; // 11pt in half-points

function blank(count: number): Paragraph[] {
  return Array.from({ length: count }, () => new Paragraph({ text: '' }));
}

export async function buildTournamentBonafideDocx(students: IStudent[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(...blank(4));
  children.push(new Paragraph({ children: [new TextRun({ text: 'To .', size: SUB_SIZE })] }));
  children.push(...blank(3));
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Sub : List of Students participating in ______________(game) tournament .', bold: true, size: SUB_SIZE }),
      ],
    })
  );
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            'With reference to the above subject, I wish to state that the following Bonafide students of our college will be participating in _____________________________________ tournament .',
          size: SUB_SIZE,
        }),
      ],
    })
  );
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Hence, I request you to kindly permit them and oblige', size: SUB_SIZE })],
    })
  );
  children.push(new Paragraph({ text: '' }));

  const headerRow = new TableRow({
    children: ['Sl.No.', 'Name', 'USN', 'Branch'].map(
      (h) =>
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        })
    ),
  });

  const dataRows = students.map(
    (s, i) =>
      new TableRow({
        children: [String(i + 1), s.name ?? '', s.usn ?? '', s.branch ?? ''].map(
          (v) => new TableCell({ children: [new Paragraph({ text: v })] })
        ),
      })
  );

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }));
  children.push(...blank(2));

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Physical Education Director' })] }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: 'Principal' })],
          }),
        ],
      }),
    ],
  });
  children.push(signatureTable);

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
