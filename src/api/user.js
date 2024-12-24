import request from '@/config/axios'

export function getUserList(params) {
  return request({
    url: '/api/admin/users',
    method: 'get',
    params
  })
} 