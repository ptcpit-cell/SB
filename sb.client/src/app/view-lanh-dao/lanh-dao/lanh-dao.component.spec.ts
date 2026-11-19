import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanhDaoComponent } from './lanh-dao.component';

describe('LanhDaoComponent', () => {
  let component: LanhDaoComponent;
  let fixture: ComponentFixture<LanhDaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LanhDaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LanhDaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
