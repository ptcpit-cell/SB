using Dapper;
using System.Data;

namespace SB_DAL.DapperContext
{
    public interface IDapperContext
    {
        // Truy vấn (Read)
        Task<IEnumerable<T>> GetStoreAsync<T>(string proc, object? param = null) where T : class;
        Task<IEnumerable<T>> GetSQLAsync<T>(string sql, object? param = null) where T : class;
        Task<T?> ExecuteScalarAsync<T>(string sqlOrProc, object? param = null, CommandType commandType = CommandType.Text);

        // Thực thi (Write)
        Task<int> ExecuteStoreAsync(string proc, object? param = null);
        Task<int> ExecuteSQLAsync(string sql, object? param = null);

        // Tiện ích
        void CopyData(string tablename, DataTable data);
        DataTable ExecuteStoreToDataTable(string proc, object? param = null);
        Task<T> GetMultipleAsync<T>(string proc, object? param, Func<SqlMapper.GridReader, Task<T>> read);
    }
}