import React from 'react'
import TechnicianEnvironment from '../technician/TechnicianEnvironment'

const OwnerEnvironment = () => {
	return (
		<TechnicianEnvironment
			readOnly
			pageTitle="Dữ liệu môi trường"
			pageSubtitle="Xem tất cả dữ liệu môi trường các ao do kỹ sư nhập (chế độ chỉ xem)."
		/>
	)
}

export default OwnerEnvironment
