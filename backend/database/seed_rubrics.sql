-- ============================================================
-- seed_rubrics.sql  —  Auto-generated from live local DB (2026-09-29)
-- ============================================================
-- SAFE TO RUN ON PRODUCTION:
--   • Only inserts rubrics if the Dofa_rubrics table is EMPTY.
--   • If rubrics already exist it does nothing — no duplicates.
--   • Use on a fresh deployment or after running the schema SQL.
--
-- HOW TO RUN:
--   mysql -u <user> -p <dbname> < backend/database/seed_rubrics.sql
--   OR via Node:  node backend/scripts/seed_rubrics.js
-- ============================================================

-- Only seed when the table is empty (prevents duplicates on re-run)
INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, per_unit_marks, weightage)
SELECT * FROM (SELECT
  "1. Teaching Feedback" AS section_name, "If no. of students is greater than or equal to 50: Feedback>=4" AS sub_section, 5.00 AS max_marks, "manual" AS scoring_type, NULL AS per_unit_marks, NULL AS weightage
UNION ALL SELECT "1. Teaching Feedback", "If no. of students is greater than or equal to 50: 3.5<=Feedback<4", 4.00, "manual", NULL, NULL
UNION ALL SELECT "1. Teaching Feedback", "If no. of students is greater than or equal to 50: 3<=Feedback<3.5", 3.00, "manual", NULL, NULL
UNION ALL SELECT "1. Teaching Feedback", "If no. of students is less than 50: Feedback>=4", 4.00, "manual", NULL, NULL
UNION ALL SELECT "1. Teaching Feedback", "If no. of students is less than 50: 3.5<=Feedback<4", 3.00, "manual", NULL, NULL
UNION ALL SELECT "1. Teaching Feedback", "If no. of students is less than 50: 3<=Feedback<3.5", 2.00, "manual", NULL, NULL
UNION ALL SELECT "2. Research Guidance", "BTP (points for each project)", 1.00, "manual", NULL, NULL
UNION ALL SELECT "2. Research Guidance", "PhD guidance (points for each project)", 15.00, "manual", NULL, NULL
UNION ALL SELECT "2. Research Guidance", "Co-guide", 7.50, "manual", NULL, NULL
UNION ALL SELECT "2. Research Guidance", "M.Tech./M.Sc. Project guidance (points for each student)", 5.00, "manual", NULL, NULL
UNION ALL SELECT "2. Research Guidance", "LUSIP/Mini Project", 1.00, "manual", NULL, NULL
UNION ALL SELECT "3. New Courses designed", "New Courses designed", 4.00, "manual", NULL, NULL
UNION ALL SELECT "4. Research publications", "Journals: Q1", 10.00, "manual", NULL, NULL
UNION ALL SELECT "4. Research publications", "Journals: Q2", 8.00, "manual", NULL, NULL
UNION ALL SELECT "4. Research publications", "Journals: Q3", 6.00, "manual", NULL, NULL
UNION ALL SELECT "4. Research publications", "Journals: Q4 / Scopus", 4.00, "manual", NULL, NULL
UNION ALL SELECT "4. Research publications", "Journals: Peer Reviewed", 2.00, "manual", NULL, NULL
UNION ALL SELECT "5. Conference", "Tier 1", 5.00, "manual", NULL, NULL
UNION ALL SELECT "5. Conference", "Tier 2", 3.00, "manual", NULL, NULL
UNION ALL SELECT "5. Conference", "Tier 3", 2.00, "manual", NULL, NULL
UNION ALL SELECT "6. Others", "Paper/Poster Presentation", 2.00, "manual", NULL, NULL
UNION ALL SELECT "6. Others", "Book chapter", 3.00, "manual", NULL, NULL
UNION ALL SELECT "6. Others", "Book edited", 5.00, "manual", NULL, NULL
UNION ALL SELECT "6. Others", "Textbook published", 6.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: Value>=20lacs (points for each project for PI)", 15.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: Values>=20lacs (points for each project for co-PI)", 7.50, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 10lacs<=value<20lacs (PI)", 12.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 10lacs<=value<20lacs (co-PI)", 6.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 5lacs<=value<10lacs (PI)", 9.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 5lacs<=value<10lacs (co-PI)", 4.50, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 2lacs<=value<5lacs (PI)", 6.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 2lacs<=value<5lacs (co-PI)", 3.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 50000<=value<2lacs (PI)", 3.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Grants received: 50000<=value<2lacs (co-PI)", 1.50, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Proposals submitted: Submitted in that AY (PI)", 2.00, "manual", NULL, NULL
UNION ALL SELECT "7. Sponsored project (approved in AY)", "Proposals submitted: Submitted in that AY (co-PI)", 1.00, "manual", NULL, NULL
UNION ALL SELECT "8. Patent", "Granted in that AY", 10.00, "manual", NULL, NULL
UNION ALL SELECT "8. Patent", "Published in that AY", 5.00, "manual", NULL, NULL
UNION ALL SELECT "9. Technology Contribution", "Technology developed and transferred [3/6/10 points]", 10.00, "manual", NULL, NULL
UNION ALL SELECT "9. Technology Contribution", "Software developed and deployment [3/6/10 points]", 10.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Convenor (coordinator)/organizing chair of workshop/conference/FDP", 5.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Co-convenor/co-coordinator of workshop/conference/FDP", 3.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Organizing committee member of workshop/conference/FDP", 1.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Invited talks: FDPs/Conferences (up to a maximum of 10 points)", 2.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Invited talks: Other invited talks (up to a maximum of 8 points)", 1.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Conference outside LNMIIT: PC Chair, Session Chair, General Chair", 2.00, "manual", NULL, NULL
UNION ALL SELECT "10. Talks and conferences", "Conference outside LNMIIT: TPC member, Other member", 0.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Visits to other institutions for Research/Industries for Collaborative work (up to a max of 10)", 1.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "International Honours", 10.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "National Honours", 5.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: Project Value >5 lacs (PI)", 10.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: Project Value >5 lacs (co-PI)", 5.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: 2 lacs<=Project Value<=5lacs (PI)", 6.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: 2 lacs<=Project Value<=5lacs (co-PI)", 3.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: Project value <2 lacs (PI)", 3.00, "manual", NULL, NULL
UNION ALL SELECT "11. Visits/Honours/Consultancy", "Consultancy Project: Project value <2 lacs (co-PI)", 1.50, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Dean", 15.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Associate Dean", 10.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Assistant Dean", 5.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: HoD", 15.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Chief Warden", 10.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Associate Chief Warden", 7.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Hostel Warden/ Mess Warden", 5.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Assistant Warden", 3.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Centre Lead", 10.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Administrative Positions: Centre Co-Lead", 5.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Chairperson of one or more significant committees", 10.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Convenor of one or more significant committees", 6.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Committee Member (up to a maximum of 5 points)", 1.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Faculty Mentor of any Cell (Mentorship)", 2.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc)", 6.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Conduct of new certificate programmes", 5.00, "manual", NULL, NULL
UNION ALL SELECT "12. Other Institutional Contributions", "Other Significant: Scholarly articles in reputed newspapers/magazines (max 9 points)", 3.00, "manual", NULL, NULL
UNION ALL SELECT "13. Other activities", "Other activities (up to a maximum of 10 points) [1-3 points]", 3.00, "manual", NULL, NULL
) AS rubrics_data
WHERE (SELECT COUNT(*) FROM Dofa_rubrics) = 0;
