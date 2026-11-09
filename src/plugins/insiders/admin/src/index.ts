import { User } from '@strapi/icons';
export default {
  register(app: any) {
    app.addMenuLink({ icon: User, to: 'plugins/insiders', intlLabel: { id: 'insiders.name', defaultMessage: 'Insiders' }, Component: () => import('./Page'), permissions: [{ action: 'plugin::insiders.manage', subject: null }] });
    app.registerPlugin({ id: 'insiders', name: 'Insiders' });
  },
};
