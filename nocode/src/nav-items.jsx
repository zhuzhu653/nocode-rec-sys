import { HomeIcon, MapIcon, CalendarIcon, UsersIcon, StarIcon, UserIcon, SettingsIcon, ShoppingBagIcon, ShoppingCartIcon } from "lucide-react";
import Index from "./pages/Index.jsx";
import Discover from "./pages/Discover.jsx";
import ExperienceWithBooking from "./pages/ExperienceWithBooking.jsx";
import WorkshopDetail from "./pages/WorkshopDetail.jsx";
import Community from "./pages/Community.jsx";
import Instructors from "./pages/Instructors.jsx";
import InstructorDetail from "./pages/InstructorDetail.jsx";
import UserCenter from "./pages/UserCenter.jsx";
import UserCenter_true from "./pages/UserCenter_true.jsx";
import Auth from "./pages/Auth.jsx";
import WorkshopBookingDetail from "./components/WorkshopBookingDetail.jsx";
import BookingSuccess from "./pages/BookingSuccess.jsx";
import Settings from "./pages/Settings.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";

/**
* Central place for defining the navigation items. Used for navigation components and routing.
*/
export const navItems = [
  {
    title: "首页",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "发现",
    to: "/discover",
    icon: <MapIcon className="h-4 w-4" />,
    page: <Discover />,
  },
  {
    title: "体验",
    to: "/experience",
    icon: <CalendarIcon className="h-4 w-4" />,
    page: <ExperienceWithBooking />,
  },
  {
    title: "工作坊详情",
    to: "/workshop/:id",
    icon: <CalendarIcon className="h-4 w-4" />,
    page: <WorkshopDetail />,
  },
  {
    title: "课程预约",
    to: "/booking/:id",
    icon: <CalendarIcon className="h-4 w-4" />,
    page: <WorkshopBookingDetail />,
  },
  {
    title: "预约成功",
    to: "/booking-success",
    icon: <CalendarIcon className="h-4 w-4" />,
    page: <BookingSuccess />,
  },
  {
    title: "社区",
    to: "/community",
    icon: <UsersIcon className="h-4 w-4" />,
    page: <Community />,
  },
  {
    title: "达人",
    to: "/instructors",
    icon: <StarIcon className="h-4 w-4" />,
    page: <Instructors />,
  },
  {
    title: "达人详情",
    to: "/instructor/:id",
    icon: <StarIcon className="h-4 w-4" />,
    page: <InstructorDetail />,
  },
  {
    title: "用户中心",
    to: "/user-center",
    icon: <UserIcon className="h-4 w-4" />,
    page: <UserCenter />,
  },
  {
    title: "用户中心真实版",
    to: "/user-center-true",
    icon: <UserIcon className="h-4 w-4" />,
    page: <UserCenter_true />,
  },
  {
    title: "设置",
    to: "/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
  {
    title: "登录/注册",
    to: "/auth",
    icon: <UserIcon className="h-4 w-4" />,
    page: <Auth />,
  },
  {
    title: "集市",
    to: "/marketplace",
    icon: <ShoppingBagIcon className="h-4 w-4" />,
    page: <Marketplace />,
  },
  {
    title: "购物车",
    to: "/cart",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
    page: <Cart />,
    hidden: true // 不在导航显示，通过图标访问
  },
  {
    title: "商品详情",
    to: "/product/:id",
    page: <ProductDetail />,
    hidden: true // 不在导航显示
  },
];
