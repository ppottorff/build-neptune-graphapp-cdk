"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraph = exports.getProfile = exports.getRelationName = void 0;
exports.getRelationName = `
  query getRelationName($type: String!, $name: String!, $value: String!) {
    getRelationName(type: $type, name: $name, value: $value) {
      name
    }
  }
`;
exports.getProfile = `
  query getProfile($type: String!, $name: String!, $value: String!) {
    getProfile(type: $type, name: $name, value: $value) {
      search_name
      usage
      belong_to
      authored_by
      affiliated_with
      people
      made_by
    }
  }
`;
exports.getGraph = `
  query getGraph($type: String!, $value: String!) {
    getGraph(type: $type, value: $value) {
      nodes {
        id
        label
      }
      links {
        source
        target
        value
      }
    }
  }
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJxdWVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBYSxRQUFBLGVBQWUsR0FBaUI7Ozs7OztDQU01QyxDQUFDO0FBRVcsUUFBQSxVQUFVLEdBQWlCOzs7Ozs7Ozs7Ozs7Q0FZdkMsQ0FBQztBQUNXLFFBQUEsUUFBUSxHQUFpQjs7Ozs7Ozs7Ozs7Ozs7Q0FjckMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBnZXRSZWxhdGlvbk5hbWUgPSAvKiBHcmFwaFFMICovIGBcbiAgcXVlcnkgZ2V0UmVsYXRpb25OYW1lKCR0eXBlOiBTdHJpbmchLCAkbmFtZTogU3RyaW5nISwgJHZhbHVlOiBTdHJpbmchKSB7XG4gICAgZ2V0UmVsYXRpb25OYW1lKHR5cGU6ICR0eXBlLCBuYW1lOiAkbmFtZSwgdmFsdWU6ICR2YWx1ZSkge1xuICAgICAgbmFtZVxuICAgIH1cbiAgfVxuYDtcblxuZXhwb3J0IGNvbnN0IGdldFByb2ZpbGUgPSAvKiBHcmFwaFFMICovIGBcbiAgcXVlcnkgZ2V0UHJvZmlsZSgkdHlwZTogU3RyaW5nISwgJG5hbWU6IFN0cmluZyEsICR2YWx1ZTogU3RyaW5nISkge1xuICAgIGdldFByb2ZpbGUodHlwZTogJHR5cGUsIG5hbWU6ICRuYW1lLCB2YWx1ZTogJHZhbHVlKSB7XG4gICAgICBzZWFyY2hfbmFtZVxuICAgICAgdXNhZ2VcbiAgICAgIGJlbG9uZ190b1xuICAgICAgYXV0aG9yZWRfYnlcbiAgICAgIGFmZmlsaWF0ZWRfd2l0aFxuICAgICAgcGVvcGxlXG4gICAgICBtYWRlX2J5XG4gICAgfVxuICB9XG5gO1xuZXhwb3J0IGNvbnN0IGdldEdyYXBoID0gLyogR3JhcGhRTCAqLyBgXG4gIHF1ZXJ5IGdldEdyYXBoKCR0eXBlOiBTdHJpbmchLCAkdmFsdWU6IFN0cmluZyEpIHtcbiAgICBnZXRHcmFwaCh0eXBlOiAkdHlwZSwgdmFsdWU6ICR2YWx1ZSkge1xuICAgICAgbm9kZXMge1xuICAgICAgICBpZFxuICAgICAgICBsYWJlbFxuICAgICAgfVxuICAgICAgbGlua3Mge1xuICAgICAgICBzb3VyY2VcbiAgICAgICAgdGFyZ2V0XG4gICAgICAgIHZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9XG5gO1xuIl19