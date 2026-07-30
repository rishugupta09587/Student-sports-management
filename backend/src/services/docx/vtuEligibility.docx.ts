import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { IStudent } from '../../models/Student.model';
import { fetchImageForDocx } from './imageHelper';

const HEADER_ROW_1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const HEADER_ROW_2 = ['SL NO.', 'Student Details', 'Course Details', 'Academic Details', 'VTU Previous', 'Photo', 'Signature'];

function headerRow(values: string[], bold = true): TableRow {
  return new TableRow({
    children: values.map(
      (value) =>
        new TableCell({
          width: { size: 100 / values.length, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: value, bold })] })],
        })
    ),
  });
}

function multiLineCell(lines: string[]): TableCell {
  return new TableCell({
    children: lines.map((line) => new Paragraph({ text: line })),
  });
}

export async function buildVtuEligibilityDocx(students: IStudent[], academicYear = '2025-26'): Promise<Buffer> {
  const rows: TableRow[] = [headerRow(HEADER_ROW_1), headerRow(HEADER_ROW_2)];

  for (let i = 0; i < students.length; i += 1) {
    const s = students[i];
    const cells: TableCell[] = [
      multiLineCell([String(i + 1)]),
      multiLineCell([
        `Name: ${s.name ?? ''}`,
        `Father: ${s.fatherName ?? ''}`,
        `Mother: ${s.motherName ?? ''}`,
        `Branch: ${s.branch ?? ''}`,
        `USN: ${s.usn ?? ''}`,
      ]),
      multiLineCell([
        `Course: ${s.branch ?? ''}`,
        'Duration: 4 Years',
        `DOB: ${s.dob ?? ''}`,
        `Contact: ${s.phone ?? ''}`,
      ]),
      multiLineCell(['PUC Date: ___', 'First Admission: ___', 'Current Admission: ___']),
      multiLineCell([`Game: ${s.sport ?? ''}`, 'Year: ___']),
    ];

    let photoCell: TableCell;
    if (s.photoUrl) {
      const image = await fetchImageForDocx(s.photoUrl);
      if (image) {
        photoCell = new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: image.buffer,
                  type: image.type,
                  transformation: { width: 90, height: 115 },
                }),
              ],
            }),
          ],
        });
      } else {
        photoCell = multiLineCell(['Photo Not Found']);
      }
    } else {
      photoCell = multiLineCell(['No Photo']);
    }
    cells.push(photoCell);
    cells.push(multiLineCell(['']));

    rows.push(new TableRow({ children: cells }));
  }

  const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'ELIGIBILITY PROFORMA', bold: true, underline: {} })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun(
                `ELIGIBILITY PROFORMA OF PLAYERS REPRESENTING COLLEGE IN VTU INTER-COLLEGIATE SPORTS/TOURNAMENT ${academicYear}`
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun('COLLEGE NAME & ADDRESS : '),
              new TextRun({
                text: 'DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT, BANGALURU 560082',
                underline: {},
              }),
            ],
          }),
          new Paragraph({ text: 'GAME :- ____________' }),
          new Paragraph({
            text: 'ORGANISING COLLEGE:- __________________________________DIVISION : Bangalore division _________________',
          }),
          new Paragraph({ text: '' }),
          table,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
