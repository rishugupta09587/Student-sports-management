import { Student } from '../models/Student.model';
import { Report } from '../models/Report.model';
import { Template } from '../models/Template.model';

export async function getDashboardStats() {
  const [
    totalStudents,
    totalReports,
    totalTemplates,
    byBranch,
    bySport,
    byGender,
    byBloodGroup,
    recentStudents,
    recentReports,
  ] = await Promise.all([
    Student.countDocuments(),
    Report.countDocuments(),
    Template.countDocuments(),
    Student.aggregate([
      { $match: { branch: { $nin: [null, ''] } } },
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Student.aggregate([
      { $match: { sport: { $nin: [null, ''] } } },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Student.aggregate([
      { $match: { gender: { $nin: [null, ''] } } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]),
    Student.aggregate([
      { $match: { bloodGroup: { $nin: [null, ''] } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
    ]),
    Student.find().sort({ createdAt: -1 }).limit(5),
    Report.find().sort({ createdAt: -1 }).limit(5),
  ]);

  return {
    totals: { students: totalStudents, reports: totalReports, templates: totalTemplates },
    byBranch: byBranch.map((b) => ({ label: b._id as string, count: b.count as number })),
    bySport: bySport.map((s) => ({ label: s._id as string, count: s.count as number })),
    byGender: byGender.map((g) => ({ label: g._id as string, count: g.count as number })),
    byBloodGroup: byBloodGroup.map((g) => ({ label: g._id as string, count: g.count as number })),
    recentStudents,
    recentReports,
  };
}
