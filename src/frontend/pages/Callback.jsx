import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const exchangeCode = async () => {
      try {
        const response = await axios.get("/api/callback", {
          withCredentials: true,
        });

        // Store any returned user/session info if needed 
        // Example: localStorage.setItem("user", JSON.stringify(response.data));

        navigate("/dashboard");
      } catch (error) {
        console.error("Callback error:", error);
        navigate("/login");
      }
    };

    exchangeCode();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg">Logging in...</p>
    </div>
  );
};

export default Callback;
