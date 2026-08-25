-- Use the broader Hostel Warden/Mess Warden designation in the institutional-contributions rubric.
UPDATE Dofa_rubrics
SET sub_section = 'Administrative Positions: Hostel Warden/ Mess Warden'
WHERE section_name = '13. Other Institutional Contributions'
  AND sub_section = 'Administrative Positions: Warden';
