import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import {
  ALL_BINOTEL_CALLS_VIEW_UNIVERSAL_IDENTIFIER,
  BINOTEL_CALLS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier:
    BINOTEL_CALLS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Звонки Binotel',
  icon: 'IconPhone',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ALL_BINOTEL_CALLS_VIEW_UNIVERSAL_IDENTIFIER,
});
