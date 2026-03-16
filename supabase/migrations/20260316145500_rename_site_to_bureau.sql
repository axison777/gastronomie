UPDATE employees SET site = 'Bureau 1' WHERE site = 'Site 1';
UPDATE employees SET site = 'Bureau 2' WHERE site = 'Site 2';
UPDATE employees SET site = 'Bureau 1' WHERE site IS NULL;
