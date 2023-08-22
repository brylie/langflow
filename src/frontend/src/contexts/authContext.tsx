import { createContext, useEffect, useState } from "react";
import Cookies from "universal-cookie";
import { getLoggedUser, getRepoStars } from "../controllers/API";
import { Users } from "../types/api";
import { AuthContextType } from "../types/contexts/auth";

const initialValue: AuthContextType = {
  isAdmin: false,
  setIsAdmin: () => false,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  login: () => {},
  logout: () => {},
  refreshAccessToken: () => Promise.resolve(),
  userData: null,
  setUserData: () => {},
  getAuthentication: () => false,
  authenticationErrorCount: 0,
  autoLogin: false,
  setAutoLogin: () => {},
  stars: 0,
  setStars: (stars) => 0,
};

export const AuthContext = createContext<AuthContextType>(initialValue);

export function AuthProvider({ children }): React.ReactElement {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userData, setUserData] = useState<Users | null>(null);
  const [autoLogin, setAutoLogin] = useState<boolean>(false);
  const [stars, setStars] = useState<number>(0);
  const cookies = new Cookies();

  useEffect(() => {
    const storedAccessToken = cookies.get("access_token");
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
    }
    async function fetchStars() {
      const starsCount = await getRepoStars("logspace-ai", "langflow");
      setStars(starsCount);
    }
    fetchStars();
  }, []);

  useEffect(() => {
    if (accessToken) {
      getLoggedUser().then((user) => {
        const isSuperUser = user.is_superuser;
        setIsAdmin(isSuperUser);
      });
    }
  }, [accessToken, isAdmin]);

  function getAuthentication() {
    const storedRefreshToken = cookies.get("refresh_token");
    const storedAccess = cookies.get("access_token");
    const auth = storedAccess && storedRefreshToken ? true : false;
    return auth;
  }

  function login(newAccessToken: string, refreshToken: string) {
    cookies.set("access_token", newAccessToken, { path: "/" });
    cookies.set("refresh_token", refreshToken, { path: "/" });
    setAccessToken(newAccessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);
  }

  function logout() {
    cookies.remove("access_token", { path: "/" });
    cookies.remove("refresh_token", { path: "/" });
    setUserData(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
  }

  async function refreshAccessToken(refreshToken: string) {
    try {
      const response = await fetch("/api/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        login(data.accessToken, refreshToken);
        getLoggedUser().then((user) => {
          console.log("oi");
        });
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  }

  return (
    // !! to convert string to boolean
    <AuthContext.Provider
      value={{
        stars,
        setStars,
        isAdmin,
        setIsAdmin,
        isAuthenticated: !!accessToken,
        accessToken,
        refreshToken,
        login,
        logout,
        refreshAccessToken,
        setUserData,
        userData,
        getAuthentication,
        authenticationErrorCount: 0,
        setAutoLogin,
        autoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}