using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.IdentityModel.Tokens;
using SB_DAL.DapperContext;
using SB_Services.Helpers;
using SB_Services.Services.Account;
using SB_Services.Services.Admin;
using SB_Services.Services.Common;
using SB_Services.Services.LanhDao;
using SB_Services.Services.Report;
using SB_Services.Services.Requests;
using SB_Services.Services.TroLy;
using SB_Services.Services.Users;
using System.Text;
using static SB_DAL.DapperContext.DapperContext;

var builder = WebApplication.CreateBuilder(args);
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtKeyRaw = !string.IsNullOrWhiteSpace(jwtSection["Key"])
    ? jwtSection["Key"]!
    : (!string.IsNullOrWhiteSpace(jwtSettings["Key"])
        ? jwtSettings["Key"]!
        : "tCKxFPOVqsTpOsy+zJbmYeha/P2HHjxGWmVxYJ9j7RErvz/fzMM7c5TQ8HB6hxvb");
var key = Encoding.UTF8.GetBytes(jwtKeyRaw);
// Add services to the container.
SqlMapper.AddTypeHandler(new SqlTimeOnlyTypeHandler()); // Đăng ký SqlTimeOnlyTypeHandler để xử lý kiểu dữ liệu TimeOnly
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
builder.Services.AddScoped<IDapperContext>(provider => new DapperContext(connectionString));
builder.Services.AddScoped<IAccountServices, AcccountServices>();
builder.Services.AddScoped<IUserServices, UserServices>();
builder.Services.AddScoped<ICommonServices, CommonServices>();
builder.Services.AddScoped<IRequestServices, RequestServices>();
builder.Services.AddScoped<IThongBaoNotifier, ThongBaoNotifier>();
builder.Services.AddScoped<ITroLyServices, TroLyServices>();
builder.Services.AddScoped<ILanhDaoServices, LanhDaoServices>();
builder.Services.AddScoped<IAdminServices, AdminServices>();
builder.Services.AddScoped<IReportServices, ReportServices>();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddControllers();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<HeaderFilter>(); // Đăng ký ở đây
});
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddCors();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false, // Set true nếu bạn muốn check Issuer
        ValidateAudience = false, // Set true nếu bạn muốn check Audience
        ClockSkew = TimeSpan.Zero // Loại bỏ thời gian trễ mặc định (5 phút) khi check hết hạn
    };
});
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseDefaultFiles();
app.MapStaticAssets();
app.UseCors(options => options
    .WithOrigins("http://localhost:4200", // URL của Angular
    "http://localhost:5005" // URL Flutter
    )
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials()); // BẮT BUỘC ĐỂ DÙNG COOKIE
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
provider.Mappings[".doc"] = "application/msword";
provider.Mappings[".pdf"] = "application/pdf";
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapHub<ThongBao>("/hubs/thongbao");
app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
