-- Hapus Backup Tables dari Migration
-- Run script ini di phpMyAdmin atau MySQL client

-- Hapus semua backup tables
DROP TABLE IF EXISTS total_coliform_backup_1762588764185;
DROP TABLE IF EXISTS total_coliform_backup_1762589991616;
DROP TABLE IF EXISTS total_coliform_backup_1762590949497;
DROP TABLE IF EXISTS total_coliform_backup_1762590829919;

-- Cek apakah ada backup lain (opsional)
SHOW TABLES LIKE 'total_coliform_backup_%';

-- Done! ✅
SELECT 'Backup tables berhasil dihapus!' as status;
