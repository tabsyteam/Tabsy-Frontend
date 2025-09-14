export * from './types/theme.types';
export * from './utils/colors';
export * from './utils/generateCssVariables';

export { customerTheme } from './themes/customer.theme';
export { restaurantTheme } from './themes/restaurant.theme';
export { adminTheme } from './themes/admin.theme';

import { customerTheme } from './themes/customer.theme';
import { restaurantTheme } from './themes/restaurant.theme';
import { adminTheme } from './themes/admin.theme';
import { ThemeConfig } from './types/theme.types';

export const themeConfig: ThemeConfig = {
  themes: {
    customer: customerTheme,
    restaurant: restaurantTheme,
    admin: adminTheme,
  },
  defaultTheme: 'customer',
};

export default themeConfig;