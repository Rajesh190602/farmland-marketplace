import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaUsers,
  FaSeedling,
  FaUserTie,
  FaShoppingCart,
  FaUserShield,
  FaComments,
  FaBell,
  FaUserCog,
  FaMapMarkedAlt,
  FaClipboardList,
  FaDownload,
} from "react-icons/fa";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import api from "../../services/api";


function AdminDashboard() {

  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [stats, setStats] = useState({
    total_users: 0,
    farmers: 0,
    buyers: 0,
    admins: 0,
    total_lands: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
    total_chats: 0,
  });

  const [districtData, setDistrictData] = useState([]);

  const [monthlyData, setMonthlyData] = useState([]);

  const [recentActivity, setRecentActivity] = useState([]);

  const [loading, setLoading] = useState(true);

  const [activityLoading, setActivityLoading] = useState(true);

  // Marketplace statistics
  const [marketplaceStats, setMarketplaceStats] = useState({
    listing_availability: {
      available: 0,
      reserved: 0,
      sold: 0,
    },
    inquiries: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
    },
    offers: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
    },
    site_visits: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
    },
  });


  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {

    fetchDashboard();

    fetchDistrictAnalytics();

    fetchMonthlyGrowth();

    fetchRecentActivity();

    fetchMarketplaceStatistics();

  }, []);


  // =========================================================
  // FETCH ADMIN ANALYTICS
  // =========================================================

  const fetchDashboard = async () => {

    try {

      setLoading(true);

      const response = await api.get(
        "/admin/analytics"
      );

      setStats({

        total_users:
          response.data.total_users || 0,

        farmers:
          response.data.farmers || 0,

        buyers:
          response.data.buyers || 0,

        admins:
          response.data.admins || 0,

        total_lands:
          response.data.total_lands || 0,

        pending:
          response.data.pending || 0,

        approved:
          response.data.approved || 0,

        rejected:
          response.data.rejected || 0,

        changes_requested:
          response.data.changes_requested || 0,

        total_chats:
          response.data.total_chats || 0,

      });

    } catch (error) {

      console.error(
        "Admin Dashboard Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
        "Failed to load Admin Dashboard"
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================================================
  // FETCH DISTRICT ANALYTICS
  // =========================================================

  const fetchDistrictAnalytics = async () => {

    try {

      const response = await api.get(
        "/admin/district-analytics"
      );

      const data = response.data.map(
        (item) => ({
          name: item.district,
          Lands: item.count,
        })
      );

      setDistrictData(data);

    } catch (error) {

      console.error(
        "District Analytics Error:",
        error
      );

    }

  };


  // =========================================================
  // FETCH MONTHLY GROWTH
  // =========================================================

  const fetchMonthlyGrowth = async () => {

    try {

      const response = await api.get(
        "/admin/monthly-growth"
      );

      setMonthlyData(
        response.data || []
      );

    } catch (error) {

      console.error(
        "Monthly Growth Error:",
        error
      );

    }

  };


  // =========================================================
  // FETCH RECENT ACTIVITY
  // =========================================================

  const fetchRecentActivity = async () => {
  try {
    setActivityLoading(true);

    const response = await api.get(
      "/admin/recent-activity"
    );

    console.log(
      "Recent Activity Response:",
      response.data
    );

    setRecentActivity(
      response.data.activities || []
    );

  } catch (error) {
    console.error(
      "Recent Activity Error:",
      error
    );

    setRecentActivity([]);

  } finally {
    setActivityLoading(false);
  }
};

  // =========================================================
  // DOWNLOAD REPORTS
  // =========================================================

  const downloadReport = async (type) => {

    try {

      const token =
        sessionStorage.getItem("token");

      const response = await api.get(
        `/reports/${type}`,
        {
          responseType: "blob",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const url =
        window.URL.createObjectURL(
          new Blob([response.data])
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.setAttribute(
        "download",
        `${type}.xlsx`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {

      console.error(
        "Report Download Error:",
        error
      );

      alert(
        "Failed to download report."
      );

    }

  };


  // =========================================================
  // FETCH MARKETPLACE STATISTICS
  // =========================================================

  const fetchMarketplaceStatistics = async () => {

    try {

      const response = await api.get(
        "/admin/marketplace-statistics"
      );

      const data = response.data || {};

      setMarketplaceStats({
        listing_availability: {
          available:
            data.listing_availability?.available || 0,
          reserved:
            data.listing_availability?.reserved || 0,
          sold:
            data.listing_availability?.sold || 0,
        },

        inquiries: {
          total: data.inquiries?.total || 0,
          pending: data.inquiries?.pending || 0,
          accepted: data.inquiries?.accepted || 0,
          rejected: data.inquiries?.rejected || 0,
        },

        offers: {
          total: data.offers?.total || 0,
          pending: data.offers?.pending || 0,
          accepted: data.offers?.accepted || 0,
          rejected: data.offers?.rejected || 0,
        },

        site_visits: {
          total: data.site_visits?.total || 0,
          pending: data.site_visits?.pending || 0,
          accepted: data.site_visits?.accepted || 0,
          rejected: data.site_visits?.rejected || 0,
          completed: data.site_visits?.completed || 0,
          cancelled: data.site_visits?.cancelled || 0,
        },
      });

    } catch (error) {

      console.error(
        "Marketplace Statistics Error:",
        error
      );

    }

  };


  // =========================================================
  // ACTION COLOR
  // =========================================================

  const getActionColor = (action) => {

    if (!action) {
      return "#616161";
    }

    const normalized =
      action.toUpperCase();

    if (
      normalized.includes("LOGIN")
    ) {
      return "#1565C0";
    }

    if (
      normalized.includes("CREATE")
    ) {
      return "#2E7D32";
    }

    if (
      normalized.includes("APPROVE")
    ) {
      return "#2E7D32";
    }

    if (
      normalized.includes("FAVORITE")
    ) {
      return "#D81B60";
    }

    if (
      normalized.includes("MESSAGE")
    ) {
      return "#6A1B9A";
    }

    if (
      normalized.includes("FILE")
    ) {
      return "#6A1B9A";
    }

    if (
      normalized.includes("UPDATE")
    ) {
      return "#EF6C00";
    }

    if (
      normalized.includes("CHANGE")
    ) {
      return "#EF6C00";
    }

    if (
      normalized.includes("REJECT")
    ) {
      return "#C62828";
    }

    if (
      normalized.includes("DELETE")
    ) {
      return "#C62828";
    }

    return "#616161";

  };


  // =========================================================
  // CARD STYLE
  // =========================================================

  const cardStyle = (color) => ({

    background: "#fff",

    borderRadius: "18px",

    padding: "25px",

    boxShadow:
      "0 8px 20px rgba(0,0,0,0.12)",

    textAlign: "center",

    borderTop:
      `6px solid ${color}`,

    minWidth: "220px",

    flex: "1",

  });


  // =========================================================
  // ACTION BUTTON STYLE
  // =========================================================

  const actionButton = (color) => ({

    background: color,

    color: "#fff",

    border: "none",

    borderRadius: "10px",

    padding: "15px",

    cursor: "pointer",

    fontSize: "16px",

    fontWeight: "bold",

    width: "250px",

  });


  // =========================================================
  // LAND STATUS CHART
  // =========================================================

  const chartData = [

    {
      name: "Pending",
      value: stats.pending,
    },

    {
      name: "Approved",
      value: stats.approved,
    },

    {
      name: "Rejected",
      value: stats.rejected,
    },

    {
      name: "Changes Requested",
      value:
        stats.changes_requested,
    },

  ];


  // =========================================================
  // MARKETPLACE BAR CHART
  // =========================================================

  const barData = [

    {
      name: "Users",
      value: stats.total_users,
    },

    {
      name: "Farmers",
      value: stats.farmers,
    },

    {
      name: "Buyers",
      value: stats.buyers,
    },

    {
      name: "Admins",
      value: stats.admins,
    },

    {
      name: "Lands",
      value: stats.total_lands,
    },

    {
      name: "Chats",
      value: stats.total_chats,
    },

  ];


  // =========================================================
  // PIE COLORS
  // =========================================================

  const COLORS = [

    "#F9A825",

    "#43A047",

    "#E53935",

    "#FB8C00",

  ];


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div
        style={{
          minHeight: "100vh",

          display: "flex",

          justifyContent: "center",

          alignItems: "center",

          background: "#F5F7FA",

          fontSize: "24px",

          color: "#2E7D32",

          fontWeight: "bold",
        }}
      >

        Loading Admin Dashboard...

      </div>

    );

  }


  // =========================================================
  // RETURN
  // =========================================================

  return (

    <div
      style={{
        minHeight: "100vh",

        background: "#F5F7FA",

        padding: "30px",
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          background:
            "linear-gradient(135deg,#1B5E20,#43A047)",

          color: "#fff",

          borderRadius: "20px",

          padding: "30px",

          marginBottom: "35px",
        }}
      >

        <h1
          style={{
            margin: 0,
          }}
        >

          👑 Admin Dashboard

        </h1>

        <p
          style={{
            marginTop: "10px",

            fontSize: "17px",
          }}
        >

          Monitor users, lands and marketplace
          activities.

        </p>

      </div>


      {/* =====================================================
          DASHBOARD OVERVIEW
      ===================================================== */}

      <h2
        style={{
          color: "#2E7D32",

          marginBottom: "20px",
        }}
      >

        Dashboard Overview

      </h2>


      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",

          gap: "20px",
        }}
      >

        {/* TOTAL USERS */}

        <div
          style={cardStyle("#1565C0")}
        >

          <FaUsers
            size={42}
            color="#1565C0"
          />

          <h3>
            Total Users
          </h3>

          <h1>
            {stats.total_users}
          </h1>

        </div>


        {/* TOTAL LANDS */}

        <div
          style={cardStyle("#2E7D32")}
        >

          <FaSeedling
            size={42}
            color="#2E7D32"
          />

          <h3>
            Total Lands
          </h3>

          <h1>
            {stats.total_lands}
          </h1>

        </div>


        {/* FARMERS */}

        <div
          style={cardStyle("#EF6C00")}
        >

          <FaUserTie
            size={42}
            color="#EF6C00"
          />

          <h3>
            Farmers
          </h3>

          <h1>
            {stats.farmers}
          </h1>

        </div>


        {/* BUYERS */}

        <div
          style={cardStyle("#8E24AA")}
        >

          <FaShoppingCart
            size={42}
            color="#8E24AA"
          />

          <h3>
            Buyers
          </h3>

          <h1>
            {stats.buyers}
          </h1>

        </div>


        {/* ADMINS */}

        <div
          style={cardStyle("#D81B60")}
        >

          <FaUserShield
            size={42}
            color="#D81B60"
          />

          <h3>
            Admins
          </h3>

          <h1>
            {stats.admins}
          </h1>

        </div>


        {/* PENDING */}

        <div
          style={cardStyle("#F9A825")}
        >

          <h3>
            🟡 Pending
          </h3>

          <h1>
            {stats.pending}
          </h1>

        </div>


        {/* APPROVED */}

        <div
          style={cardStyle("#43A047")}
        >

          <h3>
            ✅ Approved
          </h3>

          <h1>
            {stats.approved}
          </h1>

        </div>


        {/* REJECTED */}

        <div
          style={cardStyle("#E53935")}
        >

          <h3>
            ❌ Rejected
          </h3>

          <h1>
            {stats.rejected}
          </h1>

        </div>


        {/* CHANGES REQUESTED */}

        <div
          style={cardStyle("#FB8C00")}
        >

          <h3>
            📝 Changes Requested
          </h3>

          <h1>
            {stats.changes_requested}
          </h1>

        </div>


        {/* TOTAL CHATS */}

        <div
          style={cardStyle("#00897B")}
        >

          <FaComments
            size={42}
            color="#00897B"
          />

          <h3>
            Total Chats
          </h3>

          <h1>
            {stats.total_chats}
          </h1>

        </div>

      </div>


      {/* =====================================================
          CHARTS
      ===================================================== */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(450px,1fr))",

          gap: "30px",

          marginTop: "40px",
        }}
      >

        {/* PIE CHART */}

        <div
          style={{
            background: "#fff",

            padding: "25px",

            borderRadius: "18px",

            boxShadow:
              "0 6px 18px rgba(0,0,0,0.10)",
          }}
        >

          <h3
            style={{
              textAlign: "center",

              color: "#2E7D32",
            }}
          >

            🥧 Land Status Overview

          </h3>


          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <PieChart>

              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >

                {chartData.map(
                  (entry, index) => (

                    <Cell
                      key={index}
                      fill={
                        COLORS[
                          index %
                          COLORS.length
                        ]
                      }
                    />

                  )
                )}

              </Pie>

              <Tooltip />

              <Legend />

            </PieChart>

          </ResponsiveContainer>

        </div>


        {/* MARKETPLACE BAR CHART */}

        <div
          style={{
            background: "#fff",

            padding: "25px",

            borderRadius: "18px",

            boxShadow:
              "0 6px 18px rgba(0,0,0,0.10)",
          }}
        >

          <h3
            style={{
              textAlign: "center",

              color: "#2E7D32",
            }}
          >

            📊 Marketplace Statistics

          </h3>


          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <BarChart
              data={barData}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="name"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="value"
                fill="#2E7D32"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>


      {/* =====================================================
          DISTRICT ANALYTICS
      ===================================================== */}

      <div
        style={{
          background: "#fff",

          marginTop: "40px",

          padding: "30px",

          borderRadius: "18px",

          boxShadow:
            "0 6px 18px rgba(0,0,0,0.10)",
        }}
      >

        <h2
          style={{
            color: "#2E7D32",

            textAlign: "center",

            marginBottom: "20px",
          }}
        >

          📍 District-wise Land Analytics

        </h2>


        {districtData.length === 0 ? (

          <p
            style={{
              textAlign: "center",

              color: "#777",
            }}
          >

            No district data available.

          </p>

        ) : (

          <ResponsiveContainer
            width="100%"
            height={350}
          >

            <BarChart
              data={districtData}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="name"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="Lands"
                fill="#1976D2"
              />

            </BarChart>

          </ResponsiveContainer>

        )}

      </div>


      {/* =====================================================
          MONTHLY GROWTH
      ===================================================== */}

      <div
        style={{
          background: "#fff",

          marginTop: "40px",

          padding: "30px",

          borderRadius: "18px",

          boxShadow:
            "0 6px 18px rgba(0,0,0,0.10)",
        }}
      >

        <h2
          style={{
            color: "#2E7D32",

            textAlign: "center",

            marginBottom: "20px",
          }}
        >

          📈 Monthly User Growth

        </h2>


        {monthlyData.length === 0 ? (

          <p
            style={{
              textAlign: "center",

              color: "#777",
            }}
          >

            No monthly growth data available.

          </p>

        ) : (

          <ResponsiveContainer
            width="100%"
            height={350}
          >

            <BarChart
              data={monthlyData}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="users"
                fill="#43A047"
              />

            </BarChart>

          </ResponsiveContainer>

        )}

      </div>


      {/* =====================================================
          MARKETPLACE STATISTICS
      ===================================================== */}

      <div
        style={{
          marginTop: "40px",
          background: "#fff",
          padding: "30px",
          borderRadius: "18px",
          boxShadow:
            "0 6px 18px rgba(0,0,0,0.10)",
        }}
      >

        <h2
          style={{
            color: "#2E7D32",
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          📊 Marketplace Statistics
        </h2>

        {/* LISTING AVAILABILITY */}
        <h3
          style={{
            color: "#333",
            marginBottom: "15px",
          }}
        >
          🌾 Listing Availability
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
            marginBottom: "30px",
          }}
        >

          <div style={cardStyle("#43A047")}>
            <h3>🟢 Available</h3>
            <h1>
              {marketplaceStats.listing_availability.available}
            </h1>
          </div>

          <div style={cardStyle("#F9A825")}>
            <h3>🟡 Reserved</h3>
            <h1>
              {marketplaceStats.listing_availability.reserved}
            </h1>
          </div>

          <div style={cardStyle("#E53935")}>
            <h3>🔴 Sold</h3>
            <h1>
              {marketplaceStats.listing_availability.sold}
            </h1>
          </div>

        </div>

        {/* INQUIRIES */}
        <h3
          style={{
            color: "#333",
            marginBottom: "15px",
          }}
        >
          📩 Inquiry Statistics
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
            marginBottom: "30px",
          }}
        >

          <div style={cardStyle("#1565C0")}>
            <h3>Total Inquiries</h3>
            <h1>{marketplaceStats.inquiries.total}</h1>
          </div>

          <div style={cardStyle("#F9A825")}>
            <h3>🟡 Pending</h3>
            <h1>{marketplaceStats.inquiries.pending}</h1>
          </div>

          <div style={cardStyle("#43A047")}>
            <h3>✅ Accepted</h3>
            <h1>{marketplaceStats.inquiries.accepted}</h1>
          </div>

          <div style={cardStyle("#E53935")}>
            <h3>❌ Rejected</h3>
            <h1>{marketplaceStats.inquiries.rejected}</h1>
          </div>

        </div>

        {/* OFFERS */}
        <h3
          style={{
            color: "#333",
            marginBottom: "15px",
          }}
        >
          💰 Offer Statistics
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
            marginBottom: "30px",
          }}
        >

          <div style={cardStyle("#1565C0")}>
            <h3>Total Offers</h3>
            <h1>{marketplaceStats.offers.total}</h1>
          </div>

          <div style={cardStyle("#F9A825")}>
            <h3>🟡 Pending</h3>
            <h1>{marketplaceStats.offers.pending}</h1>
          </div>

          <div style={cardStyle("#43A047")}>
            <h3>✅ Accepted</h3>
            <h1>{marketplaceStats.offers.accepted}</h1>
          </div>

          <div style={cardStyle("#E53935")}>
            <h3>❌ Rejected</h3>
            <h1>{marketplaceStats.offers.rejected}</h1>
          </div>

        </div>

        {/* SITE VISITS */}
        <h3
          style={{
            color: "#333",
            marginBottom: "15px",
          }}
        >
          📅 Site-Visit Statistics
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
          }}
        >

          <div style={cardStyle("#1565C0")}>
            <h3>Total Visits</h3>
            <h1>{marketplaceStats.site_visits.total}</h1>
          </div>

          <div style={cardStyle("#F9A825")}>
            <h3>🟡 Pending</h3>
            <h1>{marketplaceStats.site_visits.pending}</h1>
          </div>

          <div style={cardStyle("#1976D2")}>
            <h3>🔵 Accepted</h3>
            <h1>{marketplaceStats.site_visits.accepted}</h1>
          </div>

          <div style={cardStyle("#E53935")}>
            <h3>❌ Rejected</h3>
            <h1>{marketplaceStats.site_visits.rejected}</h1>
          </div>

          <div style={cardStyle("#43A047")}>
            <h3>✅ Completed</h3>
            <h1>{marketplaceStats.site_visits.completed}</h1>
          </div>

          <div style={cardStyle("#616161")}>
            <h3>⚪ Cancelled</h3>
            <h1>{marketplaceStats.site_visits.cancelled}</h1>
          </div>

        </div>

      </div>


      {/* =====================================================
          REPORTS
      ===================================================== */}

      <h2
        style={{
          color: "#2E7D32",

          marginTop: "50px",
        }}
      >

        📄 Reports

      </h2>


      <div
        style={{
          display: "flex",

          flexWrap: "wrap",

          gap: "20px",

          marginTop: "20px",
        }}
      >

        <button
          style={actionButton("#1565C0")}
          onClick={() =>
            downloadReport("users")
          }
        >

          <FaDownload /> 👥 Export Users

        </button>


        <button
          style={actionButton("#2E7D32")}
          onClick={() =>
            downloadReport("lands")
          }
        >

          <FaDownload /> 🌾 Export Lands

        </button>


        <button
          style={actionButton("#F9A825")}
          onClick={() =>
            downloadReport("pending-lands")
          }
        >

          <FaDownload /> 🟡 Export Pending Lands

        </button>


        <button
          style={actionButton("#43A047")}
          onClick={() =>
            downloadReport("approved-lands")
          }
        >

          <FaDownload /> ✅ Export Approved Lands

        </button>

      </div>


      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <h2
        style={{
          color: "#2E7D32",

          marginTop: "50px",
        }}
      >

        Quick Actions

      </h2>


      <div
        style={{
          display: "flex",

          flexWrap: "wrap",

          gap: "20px",

          marginTop: "20px",
        }}
      >

        <button
          style={actionButton("#1976D2")}
          onClick={() =>
            navigate("/admin/users")
          }
        >

          <FaUserCog /> Manage Users

        </button>


        <button
          style={actionButton("#2E7D32")}
          onClick={() =>
            navigate("/admin/lands")
          }
        >

          <FaMapMarkedAlt /> Manage Lands

        </button>


        <button
          style={actionButton("#F9A825")}
          onClick={() =>
            navigate(
              "/admin/pending-lands"
            )
          }
        >

          <FaBell /> Pending Approvals

        </button>


        <button
          style={actionButton("#6A1B9A")}
          onClick={() =>
            navigate(
              "/admin/activity-logs"
            )
          }
        >

          <FaClipboardList /> Activity Logs

        </button>

      </div>


      {/* =====================================================
          RECENT ACTIVITY
      ===================================================== */}

      <div
        style={{
          marginTop: "60px",

          background: "#fff",

          borderRadius: "18px",

          padding: "30px",

          boxShadow:
            "0 6px 18px rgba(0,0,0,0.10)",
        }}
      >

        <div
          style={{
            display: "flex",

            justifyContent:
              "space-between",

            alignItems: "center",

            gap: "15px",

            flexWrap: "wrap",
          }}
        >

          <h2
            style={{
              color: "#2E7D32",

              margin: 0,
            }}
          >

            📈 Recent Activity

          </h2>


          <button
            onClick={() =>
              navigate(
                "/admin/activity-logs"
              )
            }
            style={{
              background: "#2E7D32",

              color: "#fff",

              border: "none",

              borderRadius: "8px",

              padding: "10px 16px",

              cursor: "pointer",

              fontWeight: "bold",
            }}
          >

            View All Activity Logs →

          </button>

        </div>


        {activityLoading ? (

          <div
            style={{
              textAlign: "center",

              padding: "35px",

              color: "#777",
            }}
          >

            Loading recent activity...

          </div>

        ) : recentActivity.length === 0 ? (

          <div
            style={{
              textAlign: "center",

              padding: "35px",

              color: "#777",
            }}
          >

            No recent activity found.

          </div>

        ) : (

          <div
            style={{
              marginTop: "25px",
            }}
          >

            {recentActivity
              .slice(0, 10)
              .map((activity) => (

                <div
                  key={activity.id}
                  style={{
                    display: "flex",

                    alignItems: "flex-start",

                    gap: "15px",

                    padding: "16px 0",

                    borderBottom:
                      "1px solid #eee",
                  }}
                >

                  {/* ACTION BADGE */}

                  <span
                    style={{
                      background:
                        getActionColor(
                          activity.action
                        ),

                      color: "#fff",

                      padding:
                        "6px 10px",

                      borderRadius:
                        "20px",

                      fontSize: "11px",

                      fontWeight: "bold",

                      whiteSpace:
                        "nowrap",
                    }}
                  >

                    {activity.action}

                  </span>


                  {/* ACTIVITY CONTENT */}

                  <div
                    style={{
                      flex: 1,
                    }}
                  >

                    <div
                      style={{
                        fontWeight: "bold",

                        color: "#333",

                        marginBottom:
                          "5px",
                      }}
                    >

                      {activity.description ||
                        "Activity recorded"}

                    </div>


                    <div
                      style={{
                        fontSize: "13px",

                        color: "#777",

                        display: "flex",

                        flexWrap: "wrap",

                        gap: "10px",
                      }}
                    >


                      <span>
                         {" "}
                        {activity.user_name || "System"}
                      </span>

                       {activity.user_email && (
                         <span>
                           ✉️ {activity.user_email}
                          </span>
                        )}

                        


                      {activity.target_type && (

                        <span>

                          🎯{" "}
                          {activity.target_type}

                        </span>

                      )}


                      <span>

                        🕒{" "}

                        {activity.created_at
                          ? new Date(
                              activity.created_at
                            ).toLocaleString()
                          : "-"}

                      </span>

                    </div>

                  </div>

                </div>

              ))}

          </div>

        )}

      </div>

    </div>

  );

}


export default AdminDashboard;