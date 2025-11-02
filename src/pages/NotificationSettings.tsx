import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Bell, Clock, MessageSquare } from "lucide-react";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("09:00:00");
  const [aiTone, setAiTone] = useState("motivational");
  const [notificationTypes, setNotificationTypes] = useState<string[]>([
    "task_reminder",
    "daily_summary",
  ]);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setEnabled(data.enabled);
        setReminderTime(data.reminder_time);
        setAiTone(data.ai_tone);
        setNotificationTypes(data.notification_types);
      } else {
        // Create default preferences
        await supabase.from("notification_preferences").insert({
          user_id: user.id,
          enabled: true,
          reminder_time: "09:00:00",
          ai_tone: "motivational",
          notification_types: ["task_reminder", "daily_summary"],
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          enabled,
          reminder_time: reminderTime,
          ai_tone: aiTone,
          notification_types: notificationTypes,
        });

      if (error) throw error;

      toast.success("Notification settings saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save settings");
    }
  };

  const toggleNotificationType = (type: string) => {
    setNotificationTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Customize when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn all notifications on or off
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred Reminder Time
                </Label>
                <input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!enabled}
                />
                <p className="text-sm text-muted-foreground">
                  Choose your preferred time to receive daily reminders
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Message Tone
                </Label>
                <Select value={aiTone} onValueChange={setAiTone} disabled={!enabled}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motivational">
                      🔥 Motivational - Inspiring and empowering
                    </SelectItem>
                    <SelectItem value="funny">
                      😄 Funny - Witty and humorous
                    </SelectItem>
                    <SelectItem value="professional">
                      💼 Professional - Straightforward and constructive
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Customize the tone of AI-generated messages
                </p>
              </div>

              <div className="space-y-3">
                <Label>Notification Types</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="task_reminder"
                      checked={notificationTypes.includes("task_reminder")}
                      onCheckedChange={() => toggleNotificationType("task_reminder")}
                      disabled={!enabled}
                    />
                    <Label htmlFor="task_reminder" className="font-normal cursor-pointer">
                      Task Reminders - Get notified about incomplete tasks
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="daily_summary"
                      checked={notificationTypes.includes("daily_summary")}
                      onCheckedChange={() => toggleNotificationType("daily_summary")}
                      disabled={!enabled}
                    />
                    <Label htmlFor="daily_summary" className="font-normal cursor-pointer">
                      Daily Summary - Receive a summary of your day's progress
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekly_progress"
                      checked={notificationTypes.includes("weekly_progress")}
                      onCheckedChange={() => toggleNotificationType("weekly_progress")}
                      disabled={!enabled}
                    />
                    <Label htmlFor="weekly_progress" className="font-normal cursor-pointer">
                      Weekly Progress - Get a weekly summary of your achievements
                    </Label>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}