import { defineView } from 'twenty-sdk/define';
import { ViewType } from 'twenty-shared/types';
import {
  ALL_BINOTEL_CALLS_VIEW_UNIVERSAL_IDENTIFIER,
  BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  CALLEE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
  CALLER_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
  DIRECTION_FIELD_UNIVERSAL_IDENTIFIER,
  DURATION_SECONDS_FIELD_UNIVERSAL_IDENTIFIER,
  NAME_FIELD_UNIVERSAL_IDENTIFIER,
  RECORDING_URL_FIELD_UNIVERSAL_IDENTIFIER,
  STARTED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  ZAYAVKA_ID_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: ALL_BINOTEL_CALLS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все звонки',
  objectUniversalIdentifier: BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconPhone',
  position: 0,
  fields: [
    {
      universalIdentifier: '6afc8388-7602-4d3d-a8d9-d97a41157737',
      fieldMetadataUniversalIdentifier: DIRECTION_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: '75e1212b-095d-408d-8783-b120df60a624',
      fieldMetadataUniversalIdentifier: STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: 'ee8647ac-4c61-4e48-a138-69d0ac73ddd2',
      fieldMetadataUniversalIdentifier: CALLER_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 170,
    },
    {
      universalIdentifier: '93e804e4-6968-4d6f-b9cb-0f6b195ecd0f',
      fieldMetadataUniversalIdentifier: CALLEE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 170,
    },
    {
      universalIdentifier: 'f7e5ff6b-47ed-4a48-b393-8489e4a346fe',
      fieldMetadataUniversalIdentifier: STARTED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 170,
    },
    {
      universalIdentifier: '6a734993-5ef7-40e3-a30b-79b79ab90838',
      fieldMetadataUniversalIdentifier:
        DURATION_SECONDS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: 'f5afebac-a407-4cf5-8594-d55b16ed69de',
      fieldMetadataUniversalIdentifier: ZAYAVKA_ID_FIELD_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'eaad7d5f-ea52-43b0-9cec-20326f38bf11',
      fieldMetadataUniversalIdentifier: RECORDING_URL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'fe9225e3-e5e7-43f7-b8ec-500134ce3777',
      fieldMetadataUniversalIdentifier: NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 8,
      isVisible: false,
      size: 180,
    },
  ],
});
