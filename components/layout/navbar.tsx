"use client";

import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarItem,
  Divider,
} from "@heroui/react";
import { ThemeSwitch } from "@/components/theme-switch";
import { NavbarLogo } from "./navbar-logo";
import { NavbarMenu as DesktopNavbarMenu } from "./navbar-menu";
import { NavbarSocial } from "./navbar-social";
import { NavbarActions } from "./navbar-actions";
import { NavbarUser } from "./navbar-user";
import { NavbarMobileMenu } from "./navbar-mobile";

/**
 * 主导航栏组件
 */
export const Navbar = () => {
  return (
    <HeroUINavbar maxWidth="xl" isBordered>
      {/* 左侧Logo部分 */}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarLogo />
      </NavbarContent>

      {/* 中间导航菜单 - 桌面端 */}
      <NavbarContent className="hidden lg:flex basis-1/5 sm:basis-full" justify="center">
        <DesktopNavbarMenu />
      </NavbarContent>

      {/* 右侧工具栏 - 桌面端 */}
      <NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full" justify="end">
        <NavbarItem className="hidden sm:flex items-center gap-1">
          {/* 操作按钮 */}
          <NavbarActions />
          <Divider orientation="vertical" className="h-6" />
          
          {/* 社交链接 */}
          <NavbarSocial />
          
          {/* 主题切换 */}
          <ThemeSwitch />
        </NavbarItem>
        <NavbarUser />
      </NavbarContent>

      {/* 右侧工具栏 - 移动端 */}
      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarUser />
        <NavbarMenuToggle />
      </NavbarContent>

      {/* 移动端展开菜单 */}
      <NavbarMenu>
        <NavbarMobileMenu />
      </NavbarMenu>
    </HeroUINavbar>
  );
}; 