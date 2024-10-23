import { error, redirect } from "@sveltejs/kit";
import axios from "axios";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, cookies }) => {
  try {
    const token = cookies.get("token");
    const userAgent = request.headers.get("user-agent");

    // Server-side requests: need to explicitly include cookie in headers as server not automatically aware of cookies sent by client
    const response = await axios.get("http://localhost:3000/ums", {
      headers: {
        Cookie: `token=${token}`,
        "User-Agent": userAgent
      },
      withCredentials: true
    });

    if (response.data.success) {
      return {
        usersData: response.data.usersData,
        groupList: response.data.groupList,
        groupListPerUser: response.data.fmt_grpListPerUser
      };
    } else {
      throw error(500, "Failed to fetch data");
    }
  } catch (err) {
    if (err.response && err.response.status === 401) {
      throw redirect(302, "/login"); // Unauthorized
    } else if (err.response && err.response.status === 403) {
      throw error(403, "Not allowed to access resource"); //Forbidden
    } else {
      console.error("An error occurred:", err);
      throw error(500, "Internal Server Error");
    }
  }
};
