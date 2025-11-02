import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Marketplace = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const templates = [
    {
      title: "🎓 GATE Exam Preparation",
      description: "Complete study routine for cracking competitive exams",
      tags: ["Study", "Exam", "Engineering"],
      rating: 4.8,
      users: 1234,
    },
    {
      title: "💪 Fitness Transformation",
      description: "Build strength, endurance, and healthy eating habits",
      tags: ["Health", "Fitness", "Wellness"],
      rating: 4.9,
      users: 2156,
    },
    {
      title: "🚀 Startup Founder Routine",
      description: "Daily habits for building a successful startup",
      tags: ["Business", "Productivity", "Growth"],
      rating: 4.7,
      users: 892,
    },
    {
      title: "🎨 Creative Artist Journey",
      description: "Develop your artistic skills with daily practice",
      tags: ["Art", "Creativity", "Skills"],
      rating: 4.6,
      users: 1543,
    },
    {
      title: "📚 Reading Challenge",
      description: "Read 50 books a year with this structured plan",
      tags: ["Reading", "Learning", "Growth"],
      rating: 4.9,
      users: 3421,
    },
    {
      title: "🧘 Mindfulness Master",
      description: "Build a meditation and mindfulness practice",
      tags: ["Wellness", "Mental Health", "Peace"],
      rating: 4.8,
      users: 2789,
    },
  ];

  const usePlan = async (title: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Create plan
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .insert({
          user_id: user.id,
          title,
          description
        })
        .select()
        .single();

      if (planError) throw planError;

      // Generate habits for this plan
      const { data: habitsData, error: habitsError } = await supabase.functions.invoke('generate-habits', {
        body: { dream: title }
      });

      if (habitsError) throw habitsError;

      // Insert daily tasks - randomly assign 2 tasks as quiz type, rest as proof
      if (habitsData?.habits) {
        // Shuffle indices and pick first 2 for quiz type
        const indices = Array.from({ length: habitsData.habits.length }, (_, i) => i);
        const shuffled = indices.sort(() => Math.random() - 0.5);
        const quizIndices = new Set(shuffled.slice(0, 2));
        
        const tasksToInsert = habitsData.habits.map((habit: string, index: number) => ({
          plan_id: planData.id,
          user_id: user.id,
          title: habit,
          completed: false,
          task_type: quizIndices.has(index) ? 'quiz' : 'proof'
        }));

        const { data: insertedTasks, error: insertError } = await supabase
          .from("daily_tasks")
          .insert(tasksToInsert)
          .select();

        if (insertError) throw insertError;

        // Generate quiz questions for quiz-type tasks
        if (insertedTasks) {
          for (const task of insertedTasks) {
            if (task.task_type === 'quiz') {
              try {
                const { data: quizData, error: quizError } = await supabase.functions.invoke('generate-quiz', {
                  body: { taskTitle: task.title }
                });

                if (!quizError && quizData?.questions) {
                  await supabase
                    .from('daily_tasks')
                    .update({ quiz_questions: quizData.questions })
                    .eq('id', task.id);
                }
              } catch (error) {
                console.error('Failed to generate quiz for task:', task.title, error);
              }
            }
          }
        }
      }

      // Insert resources
      if (habitsData?.videos) {
        const resourcesToInsert = habitsData.videos.map((video: any) => ({
          plan_id: planData.id,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail: video.thumbnail,
          resource_type: 'youtube'
        }));

        await supabase.from("resources").insert(resourcesToInsert);
      }

      toast({
        title: "Plan Added! 🎉",
        description: `"${title}" has been added to your learning portal.`,
      });

      navigate("/portal");
    } catch (error: any) {
      console.error("Error adding plan:", error);
      toast({
        title: "Error",
        description: "Failed to add plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold">
              Dream <span className="text-gradient">Marketplace</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover proven habit plans from the community
            </p>
          </div>

          {/* Search Bar */}
          <Card className="p-4 bg-card border-border animate-slide-in">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plans..."
                  className="pl-10 bg-background border-border"
                />
              </div>
              <Button className="gradient-primary glow-primary text-white hover:opacity-90">
                Search
              </Button>
            </div>
          </Card>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <Card
                key={index}
                className="p-6 bg-card border-border hover:border-primary/50 transition-all hover:glow-primary animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{template.title}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag, tagIndex) => (
                      <Badge
                        key={tagIndex}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-accent fill-accent" />
                      <span>{template.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{template.users.toLocaleString()} users</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => usePlan(template.title, template.description)}
                    variant="accent"
                    className="w-full"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Use This Plan
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Share CTA */}
          <Card className="p-8 text-center bg-card border-primary/30 glow-primary animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Have a Great Habit Plan?</h2>
            <p className="text-muted-foreground mb-6">
              Share your success story and help others achieve their dreams!
            </p>
            <Button variant="hero" size="lg">
              Share Your Plan
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
