-- Raise the maximum score for other invited talks in the Talks and conferences rubric.
UPDATE Dofa_rubrics
SET sub_section = 'Invited talks: Other invited talks (up to a maximum of 8 points)'
WHERE section_name = '11. Talks and conferences'
  AND sub_section = 'Invited talks: Other invited talks (up to a maximum of 5 points)';
