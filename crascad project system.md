
---
name: CrasCAD Work Report System — Project Overview
description: Ажлын цагийн тайлан батлах системийн зорилго, шийдвэр, өгөгдлийн бүтэц, технологийн stack
type: project
---
# CrasCAD 勤務報告書 Систем
## Зорилго
Одоо Excel + имэйлээр явуулдаг ажлын цагийн тайланг вэб апп болгох.
Ажилтан тайлан бөглөж → менежер батлах → дараагийн удирдлага батлах гэсэн урсгалтай систем.

---
## Батлах урсгал (Approval Flow)

### Дүрэм (нэг загвар):
Staff / TL / GL / SGL → M → G2 (байвал) → 社長
### CADデザイン事業部:
Staff → M → G2 (山下 博) → 社長 (植木 宏次)
### 人事総務部:
Staff → M (向山 亨) → 社長 (植木 宏次)
※ G2 байхгүй учраас 2 шат
---
## Тайлан илгээх давтамж
- Сард **2 удаа** илгээнэ:
  - **前半 (zenhan)**: 1~15-ний өдрүүд → 15-нд илгээнэ
  - **後半 (kohan)**: 16~月末 → сарын сүүлд илгээнэ
- Тус бүрт **нэг нийтлэг текст тайлбар** бичнэ (өдөр бүр биш)
- Батлалтын урсгал тус бүрт явна
---
## Өгөгдлийн бүтэц (Data Model)
### departments
- id, name, has_g2
### groups
- id, name, department_id, manager_id
### users
- id, employee_number, name, grade (S1~S4, L1, L2, M1, M2, G2)
- role (Staff/TL/GL/SGL/M/G2/社長)
- group_id, manager_id, g2_id, president_id
### reports
- id, user_id, year, month
- period: 'zenhan' | 'kohan'
- period_text (нийтлэг текст тайлбар)
- 勤務日数, 超過勤務, 年休(1日/午前/午後/日数)
- 休出(日数/労働時間), 代休(当月/来月/再来月)
- 特休, 欠勤, 総工数
- status: draft→submitted→m_approved→g2_approved→completed
- submitted_at
### report_daily_entries (31 мөр/report)
- id, report_id, day (1~31)
- 勤務区分, 終業区分
- 始業時間, 終業時間, 労働時間
- 過不足_日当り, 当月累計
- 休憩_食事等
- 休日労働時間, 休日_過不足, 休日_当月累計
- 管理者確認 (bool)
### report_tasks (15 мөр хүртэл/report)
- id, report_id, row_number (1~15)
- task_name, prev_accum, monthly_total, cumulative
### report_task_daily
- id, task_id, day (1~31), hours
### approvals
- id, report_id, approver_id
- level: 'M' | 'G2' | 'president'
- status: 'pending' | 'approved' | 'rejected'
- approved_at, comment
---
## Зэрэг дэвний тайлбар
- G2 = 部長 (Хэлтсийн дарга)
- M1/M2 = マネージャー (Группын менежер)
- L1 = SGL (サブグループリーダー)
- L2 = GL (グループリーダー)
- TL = チームリーダー (S зэрэгтэй хүн гүйцэтгэнэ)
- S1~S4 = ажилд орсон дараалал (S1 хамгийн эрт, S4 хамгийн сүүлд)
Иерархи: 社長 → 部長(G2) → M → SGL(L1) → GL(L2) → TL → Staff(S)
