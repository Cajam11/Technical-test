"use client";

import { useEffect, useState } from "react";
import { User } from "./types/user";
import {
  createUser,
  fetchHobbyCounts,
  fetchUsers,
  syncUsersFromFeed,
  updateUser,
  deleteUser,
} from "./services/api";

function formatDateOnly(value: string): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [hobbyCounts, setHobbyCounts] = useState<Array<{ hobby: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    birth_date: "",
    hobbies: [] as string[],
    country: "",
    address: {
      street: "",
      city: "",
      postal_code: "",
    },
  });
  const [newUserHobbiesInput, setNewUserHobbiesInput] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, hobbyCountsData] = await Promise.all([
        fetchUsers(),
        fetchHobbyCounts(),
      ]);
      setUsers(usersData);
      setHobbyCounts(hobbyCountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadHobbyCounts = async () => {
    try {
      setHobbyCounts(await fetchHobbyCounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hobby counts");
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await syncUsersFromFeed();
      setUsers(data);
      await loadHobbyCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync from feed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");
    try {
      const created = await createUser({
        ...newUser,
        hobbies: newUserHobbiesInput
          .split(",")
          .map((hobby) => hobby.trim())
          .filter(Boolean),
      });
      setUsers((prev) => [...prev, created]);
      await loadHobbyCounts();
      setNewUser({
        name: "",
        birth_date: "",
        hobbies: [],
        country: "",
        address: { street: "", city: "", postal_code: "" },
      });
      setNewUserHobbiesInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    }
  };

  const startEditing = (user: User) => {
    setEditingUid(user.uid);
    setEditFormData({ ...user, address: { ...user.address } });
  };

  const saveEditing = async () => {
    if (!editFormData) return;

    setError("");
    try {
      const updated = await updateUser(editFormData);
      setUsers((prev) =>
        prev.map((u) => (u.uid === updated.uid ? updated : u)),
      );
      await loadHobbyCounts();
      setEditingUid(null);
      setEditFormData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  };

  const cancelEditing = () => {
    setEditingUid(null);
    setEditFormData(null);
  };

  const handleDelete = async (uid: string) => {
    setError("");
    try {
      await deleteUser(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      await loadHobbyCounts();
      if (selectedUid === uid) setSelectedUid(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h1 className="page-title">User Management</h1>
      <button onClick={handleRefresh} className="btn-primary">
        Refresh
      </button>

      <div className="hobby-container">
        <h3>Hobby Statistics:</h3>
        <div className="hobby-list">
          {hobbyCounts.map(({ hobby, count }) => (
            <span key={hobby} className="hobby-pill">
              {hobby}: <strong>{count}</strong>
            </span>
          ))}
          {hobbyCounts.length === 0 && (
            <span>No hobbies found.</span>
          )}
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && (
        <p className="error-banner" style={{ color: "#b91c1c" }}>{error}</p>
      )}
      {!loading && (
        <table className="user-table">
          <thead>
            <tr>
              <th className="table-cell">Name</th>
              <th className="table-cell">Birth Date</th>
              <th className="table-cell">Hobbies</th>
              <th className="table-cell">Country</th>
              <th className="table-cell">Street</th>
              <th className="table-cell">City</th>
              <th className="table-cell">Postal Code</th>
                <th className="table-cell">Source</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isEditing = editingUid === user.uid;
              const editRowData = isEditing ? editFormData : null;
              const rowClass = isEditing
                ? "row-editing"
                : selectedUid === user.uid
                  ? "row-selected"
                  : "row-default";

              return (
                <tr
                  key={user.uid}
                  onClick={() => !isEditing && setSelectedUid(user.uid)}
                  className={rowClass}
                >
                  {editRowData ? (
                    <>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.name}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return { ...prev, name: e.target.value };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="date"
                          value={formatDateOnly(editRowData.birth_date)}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return { ...prev, birth_date: e.target.value };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.hobbies.join(", ")}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                hobbies: e.target.value
                                  .split(",")
                                  .map((h: string) => h.trim()),
                              };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.country}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return { ...prev, country: e.target.value };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.address.street}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                address: {
                                  ...prev.address,
                                  street: e.target.value,
                                },
                              };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.address.city}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                address: {
                                  ...prev.address,
                                  city: e.target.value,
                                },
                              };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editRowData.address.postal_code}
                          onChange={(e) =>
                            setEditFormData((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                address: {
                                  ...prev.address,
                                  postal_code: e.target.value,
                                },
                              };
                            })
                          }
                          className="table-input"
                        />
                      </td>
                      <td className="table-cell">
                        <span>
                          {editRowData.locally_modified ? "Local" : "Feed"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEditing();
                          }}
                          className="btn-save"
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="table-cell">{user.name}</td>
                      <td className="table-cell">{formatDateOnly(user.birth_date)}</td>
                      <td className="table-cell">{user.hobbies.join(", ")}</td>
                      <td className="table-cell">{user.country}</td>
                      <td className="table-cell">{user.address.street}</td>
                      <td className="table-cell">{user.address.city}</td>
                      <td className="table-cell">{user.address.postal_code}</td>
                      <td className="table-cell">{user.locally_modified ? "Local" : "Feed"}</td>
                      <td className="table-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(user);
                          }}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user.uid);
                          }}
                          className="btn-delete"
                          style={{ marginLeft: 8 }}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 className="section-title">Add New User</h2>
      <div className="add-form">
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        />
        <input
          type="date"
          placeholder="Birth Date"
          value={newUser.birth_date}
          onChange={(e) =>
            setNewUser({ ...newUser, birth_date: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Hobbies (comma separated)"
          value={newUserHobbiesInput}
          onChange={(e) => setNewUserHobbiesInput(e.target.value)}
        />
        <input
          type="text"
          placeholder="Country"
          value={newUser.country}
          onChange={(e) => setNewUser({ ...newUser, country: e.target.value })}
        />
        <input
          type="text"
          placeholder="Street"
          value={newUser.address.street}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              address: { ...newUser.address, street: e.target.value },
            })
          }
        />
        <input
          type="text"
          placeholder="City"
          value={newUser.address.city}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              address: { ...newUser.address, city: e.target.value },
            })
          }
        />
        <input
          type="text"
          placeholder="Postal Code"
          value={newUser.address.postal_code}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              address: { ...newUser.address, postal_code: e.target.value },
            })
          }
        />
        <button onClick={handleAddUser} className="btn-add">
          Add User
        </button>
      </div>
    </div>
  );
}
