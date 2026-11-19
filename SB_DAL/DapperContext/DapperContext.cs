using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Transactions;

namespace SB_DAL.DapperContext
{
    public class DapperContext : IDapperContext
    {
        private readonly string _connectionString;

        public DapperContext(string connectionString)
        {
            _connectionString = connectionString;
        }
        public class SqlTimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
        {
            public override void SetValue(IDbDataParameter parameter, TimeOnly time)
            {
                parameter.Value = time.ToString();
            }

            public override TimeOnly Parse(object value)
            {
                return TimeOnly.FromTimeSpan((TimeSpan)value);
            }
        }
        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        #region TRUY VẤN DỮ LIỆU (READ)

        public async Task<IEnumerable<T>> GetStoreAsync<T>(string proc, object? param = null) where T : class
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<T>(proc, param, commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<T>> GetSQLAsync<T>(string sql, object? param = null) where T : class
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<T>(sql, param, commandType: CommandType.Text);
        }
        public async Task<T?> ExecuteScalarAsync<T>(string sqlOrProc, object? param = null, CommandType commandType = CommandType.Text)
        {
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<T>(sqlOrProc, param, commandType: commandType);
        }
        public async Task<T> GetMultipleAsync<T>(string proc, object? param, Func<SqlMapper.GridReader, Task<T>> read)
        {
            using var conn = CreateConnection();
            using var grid = await conn.QueryMultipleAsync(proc, param, commandType: CommandType.StoredProcedure);
            return await read(grid);
        }
        #endregion

        #region THỰC THI DỮ LIỆU (WRITE)

        public async Task<int> ExecuteStoreAsync(string proc, object? param = null)
        {
            using var transactionScope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled);
            using var conn = CreateConnection();

            var result = await conn.ExecuteAsync(proc, param, commandType: CommandType.StoredProcedure);

            transactionScope.Complete();
            return result;
        }

        public async Task<int> ExecuteSQLAsync(string sql, object? param = null)
        {
            using var transactionScope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled);
            using var conn = CreateConnection();

            var result = await conn.ExecuteAsync(sql, param, commandType: CommandType.Text);

            transactionScope.Complete();
            return result;
        }

        #endregion

        #region CÁC HÀM TIỆN ÍCH KHÁC

        public void CopyData(string tablename, DataTable data)
        {
            using var bulkCopy = new SqlBulkCopy(_connectionString);
            bulkCopy.DestinationTableName = tablename;
            bulkCopy.BulkCopyTimeout = 600;

            foreach (DataColumn col in data.Columns)
            {
                bulkCopy.ColumnMappings.Add(col.ColumnName, col.ColumnName);
            }
            bulkCopy.WriteToServer(data);
        }

        public DataTable ExecuteStoreToDataTable(string proc, object? param = null)
        {
            using var conn = (SqlConnection)CreateConnection();
            var table = new DataTable();
            conn.Open();

            using var reader = conn.ExecuteReader(proc, param, commandType: CommandType.StoredProcedure);
            table.Load(reader);

            return table;
        }

        #endregion
    }
}