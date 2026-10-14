/* 1 */

IF DB_ID(N'quan_ly_chi_tieu_db') IS NULL
    CREATE DATABASE quan_ly_chi_tieu_db COLLATE Vietnamese_CI_AS;
GO

USE quan_ly_chi_tieu_db;
GO

PRINT N'CSDL quan_ly_chi_tieu_db đã sẵn sàng.';
GO
