import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { apiClient } from '@erp/api-client';
import { AuthProvider, useAuth } from '../src';

test('shared web login calls the API client exactly once', async () => {
  let loginFromContext: ReturnType<typeof useAuth>['login'] | undefined;
  function Probe() {
    loginFromContext = useAuth().login;
    return null;
  }
  renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(Probe)));
  const request = jest.spyOn(apiClient, 'login').mockResolvedValue({
    success: true,
    data: {
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: '1',
        email: 'person@example.com',
        name: 'Person',
        companyId: '1',
        companyName: 'Company',
        roleId: '1',
        permissions: [],
      },
    },
  });
  await loginFromContext!('person@example.com', 'private');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'private',
    companyId: undefined,
  });
  request.mockRestore();
});
