import { Inject, Injectable } from "@angular/core";
import { AuthService } from "../auth/auth.service";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { RoleSaveRequest } from "../type";

@Injectable ({ providedIn: 'root' })
export class UserService {
  constructor(
    private http: HttpClient,
    @Inject('BASE_URL') private baseUrl: string,
    private authService: AuthService
  ) {}
  getRole(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/User/GetRole', {});
  }
  updateRoleStatus(roleId: number, isActived: any): Observable<any> {
    return this.http.post(this.baseUrl + `api/User/UpdateRoleStatus/${roleId}`, isActived);
  }
  getPermission(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/User/GetPermission', {});
  }
  updatePermissionStatus(permissionId: number, status: any): Observable<any> {
    return this.http.post(this.baseUrl + `api/User/UpdatePermissionStatus/${permissionId}`, status);
  }
  getRolePermissions(roleId: number): Observable<any> {
    return this.http.get(this.baseUrl + `api/User/GetPermissionIdsByRoleId/${roleId}`, {});
  }
  updatePermissions(payload: RoleSaveRequest): Observable<any> {
  return this.http.post(this.baseUrl + `api/User/UpdatePermissions`, payload);
}
  deleteRole(roleId: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/User/DeleteRole/${roleId}`, {});
  }
  getUser(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/User/GetAllUsers', {});
  }
  getUserRole(): Observable<any> {
    return this.http.get(this.baseUrl + `api/User/GetAllUserRoles`, {});
  }
  updateUserStatus(userId: number, data: any): Observable<any> {
    return this.http.post(this.baseUrl + `api/User/UpdateUserStatus/${userId}`, data);
  }
  createUser(userData: any): Observable<any> {
    return this.http.post(this.baseUrl + 'api/User/CreateUser', userData, {});
  }
  updateUser(userData: any): Observable<any> {
    return this.http.put(this.baseUrl + 'api/User/UpdateUser', userData, {});
  }
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/User/DeleteUser/${userId}`, {});
  }
  changePassword(data:any, userId: number): Observable<any> {
    return this.http.post(this.baseUrl + `api/Account/ChangePassword/${userId}`, data);
  }
}