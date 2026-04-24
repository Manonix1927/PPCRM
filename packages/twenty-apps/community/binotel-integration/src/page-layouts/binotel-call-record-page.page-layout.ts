import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import {
  BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  BINOTEL_CALL_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: BINOTEL_CALL_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Звонок - карточка',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: 'd0ec3970-0376-4d58-a4cd-cf79a08fba00',
      title: 'Поля',
      position: 0,
      icon: 'IconList',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '0861e8d4-6077-4f00-84f9-0f17cbfa083a',
          title: 'Поля звонка',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
          },
        },
      ],
    },
  ],
});
