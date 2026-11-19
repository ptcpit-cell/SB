import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TroLyComponent } from './tro-ly.component';

describe('TroLyComponent', () => {
  let component: TroLyComponent;
  let fixture: ComponentFixture<TroLyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TroLyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TroLyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
